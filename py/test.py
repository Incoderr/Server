import json
import re
import time
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.firefox import GeckoDriverManager
from bs4 import BeautifulSoup
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv()


class AnimeConfig:
    def __init__(self, limit=1000, delay=2):
        self.LIMIT = limit
        self.DELAY = delay
        self.MONGODB_URI = os.getenv('MONGODB_URI')
        self.DB_NAME = os.getenv('DB_NAME', 'anime_db')
        self.COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'anime_ttid_list')
        self.JSON_FILE = "anime_ttid_list.json"


def get_anime_ttid_list(config, language, existing_ttids, needed_count):
    if needed_count <= 0:
        return []

    url = "https://m.imdb.com/search/title/?title_type=feature,tv_movie,tv_special,video,tv_series,tv_miniseries&interests=in0000027"
    options = Options()
    options.set_preference("intl.accept_languages", language)
    service = Service(GeckoDriverManager().install())
    driver = webdriver.Firefox(service=service, options=options)
    driver.get(url)
    ttid_list = []
    attempts = 0
    max_attempts = 20

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "ipc-metadata-list-summary-item"))
    )

    while len(ttid_list) < needed_count and attempts < max_attempts:
        soup = BeautifulSoup(driver.page_source, "html.parser")
        anime_items = soup.find_all("li", class_="ipc-metadata-list-summary-item")
        print(f"Попытка {attempts + 1}: найдено {len(anime_items)} элементов")

        new_items = anime_items[len(ttid_list):]
        print(f"Новых элементов: {len(new_items)}")

        for item in new_items:
            ttid_match = re.search(r"/title/(tt\d+)/", item.find("a")["href"]) if item.find("a") else None
            if not ttid_match:
                print("Пропуск: TTID не найден")
                continue
            ttid = ttid_match.group(1)

            if ttid in existing_ttids:
                print(f"Пропуск {ttid} - уже существует")
                continue

            ttid_list.append({"ttid": ttid})
            print(f"Добавлен TTID: {ttid}")

            if len(ttid_list) >= needed_count:
                break

        print(f"Собрано {len(ttid_list)} из {needed_count}")

        if len(ttid_list) < needed_count:
            try:
                print("Ищем кнопку '50 more'...")
                next_button = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//span[contains(text(), '50 more')]/ancestor::button"))
                )

                # Улучшенная прокрутка к элементу
                driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});",
                                      next_button)
                time.sleep(2)  # Даем время на завершение прокрутки

                # Проверяем, видима ли кнопка
                WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//span[contains(text(), '50 more')]/ancestor::button"))
                )

                # Альтернативный клик через JavaScript если обычный не сработает
                driver.execute_script("arguments[0].click();", next_button)

                print("Ждем загрузки новых элементов...")
                WebDriverWait(driver, 15).until(
                    lambda driver: len(driver.find_elements(By.CLASS_NAME, "ipc-metadata-list-summary-item")) > len(
                        anime_items)
                )
                time.sleep(config.DELAY)
                attempts += 1
            except Exception as e:
                print(f"Не удалось загрузить больше данных: {e}")
                break

    print(f"Всего собрано {len(ttid_list)} TTID")
    driver.quit()
    return ttid_list


def load_existing_ttids(json_file):
    try:
        if Path(json_file).exists():
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {item["ttid"] for item in data}
        return set()
    except Exception as e:
        print(f"Ошибка при чтении JSON: {e}")
        return set()





if __name__ == "__main__":
    config = AnimeConfig(limit=1000, delay=2)

    existing_ttids = load_existing_ttids(config.JSON_FILE)
    print(f"Найдено {len(existing_ttids)} существующих TTID")

    needed_count = config.LIMIT - len(existing_ttids)
    print(f"Требуется найти {needed_count} новых TTID")

    if needed_count > 0:
        print("Сбор TTID на английском...")
        new_ttids = get_anime_ttid_list(config, "en-US, en", existing_ttids, needed_count)

        combined_data = [{"ttid": ttid["ttid"]} for ttid in new_ttids] + [{"ttid": ttid} for ttid in existing_ttids]

        with open(config.JSON_FILE, "w", encoding="utf-8") as f:
            json.dump(combined_data, f, ensure_ascii=False, indent=4)
        print(f"Сохранено {len(combined_data)} TTID в {config.JSON_FILE}")


    else:
        print("Лимит TTID достигнут")