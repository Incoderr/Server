import json
import re
import time
import requests
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

# Load environment variables
load_dotenv()


class AnimeConfig:
    def __init__(self, limit=1500, delay=2):
        self.LIMIT = limit
        self.DELAY = delay
        self.TMDB_API_KEY = os.getenv('TMDB_API_KEY')
        self.MONGODB_URI = os.getenv('MONGODB_URI')
        self.DB_NAME = os.getenv('DB_NAME', 'anime_db')
        self.COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'anime_list')
        self.JSON_FILE = "anime_list.json"


def get_tmdb_data(title, config):
    """Получает дополнительные данные с TMDB API (постеры, описания, рейтинги, статус)."""
    base_url = "https://api.themoviedb.org/3"
    search_url = f"{base_url}/search/tv"

    params = {
        "api_key": config.TMDB_API_KEY,
        "query": title,
        "language": "ru-RU"
    }

    try:
        # Поиск сериала
        response = requests.get(search_url, params=params)
        data = response.json()

        if data.get("results") and len(data["results"]) > 0:
            anime = data["results"][0]
            series_id = anime.get("id")

            # Получение детальной информации о сериале
            if series_id:
                details_url = f"{base_url}/tv/{series_id}"
                details_response = requests.get(details_url,
                                                params={"api_key": config.TMDB_API_KEY, "language": "ru-RU"})
                details = details_response.json()

                # Преобразование статуса на русский
                status_mapping = {
                    "Returning Series": "Выходит",
                    "Planned": "Запланировано",
                    "In Production": "В производстве",
                    "Ended": "Завершён",
                    "Canceled": "Отменён",
                    "Pilot": "Пилот"
                }

                status = status_mapping.get(details.get("status"), details.get("status", "Неизвестно"))

                return {
                    "overview_ru": anime.get("overview", ""),
                    "poster_path": f"https://image.tmdb.org/t/p/w500{anime.get('poster_path')}" if anime.get(
                        'poster_path') else None,
                    "backdrop_path": f"https://image.tmdb.org/t/p/original{anime.get('backdrop_path')}" if anime.get(
                        'backdrop_path') else None,
                    "tmdb_rating": anime.get("vote_average", 0),
                    "status": status
                }
    except Exception as e:
        print(f"Error fetching TMDB data for {title}: {e}")

    return {
        "overview_ru": "",
        "poster_path": None,
        "backdrop_path": None,
        "tmdb_rating": 0,
        "status": "Неизвестно"
    }


def extract_year(text):
    """Извлекает год из строки."""
    year_match = re.search(r'(\d{4})(?:–)?(?:\s*)?(?:\d{4})?', text)
    return year_match.group(1) if year_match else None


def clean_title(title):
    """Удаляет номера в начале названия, например, '1. Naruto' → 'Naruto'."""
    return re.sub(r"^\d+\.\s*", "", title).strip()


def get_anime_list(config, language, existing_anime, needed_count):
    if needed_count <= 0:
        return []

    url = "https://m.imdb.com/search/title/?title_type=feature,tv_movie,tv_special,video,tv_series,tv_miniseries&interests=in0000027"
    options = Options()
    options.set_preference("intl.accept_languages", language)
    service = Service(GeckoDriverManager().install())
    driver = webdriver.Firefox(service=service, options=options)
    driver.get(url)
    anime_list = []
    attempts = 0
    max_attempts = 10

    # Ждём первую загрузку
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "ipc-metadata-list-summary-item"))
    )

    while len(anime_list) < needed_count and attempts < max_attempts:
        # Парсим текущую страницу
        soup = BeautifulSoup(driver.page_source, "html.parser")
        anime_items = soup.find_all("li", class_="ipc-metadata-list-summary-item")
        print(f"Попытка {attempts + 1}: найдено {len(anime_items)} элементов на странице")

        # Обрабатываем только новые элементы
        new_items = anime_items[len(anime_list):]
        print(f"Новых элементов для обработки: {len(new_items)}")
        for item in new_items:
            ttid_match = re.search(r"/title/(tt\d+)/", item.find("a")["href"]) if item.find("a") else None
            if not ttid_match:
                print("Пропуск: TTID не найден")
                continue
            ttid = ttid_match.group(1)

            if is_anime_exists(ttid, existing_anime):
                print(f"Пропуск {ttid} - уже существует")
                continue

            title_tag = item.find("h3")
            if not title_tag:
                print("Пропуск: заголовок не найден")
                continue
            raw_title = title_tag.text.strip()
            title = clean_title(raw_title)

            year_span = item.find("span", class_="dli-title-metadata-item")
            year = extract_year(year_span.text.strip()) if year_span else None

            rating_tag = item.find("span", class_="ipc-rating-star--rating")
            rating = rating_tag.text.strip() if rating_tag else "N/A"

            anime_list.append({
                "title": title,
                "ttid": ttid,
                "rating": rating,
                "year": year
            })
            print(f"Добавлено: {title} (TTID: {ttid})")

            if len(anime_list) >= needed_count:
                break

        print(f"Собрано {len(anime_list)} из {needed_count}")

        if len(anime_list) < needed_count:
            try:
                print("Ищем кнопку '50 more'...")
                next_button = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//span[contains(text(), '50 more')]/ancestor::button"))
                )
                print("Кнопка найдена, прокручиваем к ней...")
                driver.execute_script("arguments[0].scrollIntoView(true);", next_button)
                time.sleep(1)
                print("Нажимаем кнопку...")
                next_button.click()
                print("Ждём подгрузки новых элементов...")
                WebDriverWait(driver, 15).until(
                    lambda driver: len(driver.find_elements(By.CLASS_NAME, "ipc-metadata-list-summary-item")) > len(anime_items)
                )
                time.sleep(config.DELAY)
                attempts += 1
            except Exception as e:
                print(f"Не удалось подгрузить больше данных: {e}")
                break

    print(f"Всего собрано {len(anime_list)} элементов")
    driver.quit()
    return anime_list


def load_existing_anime(json_file):
    """Загружает существующие аниме из JSON файла."""
    try:
        if Path(json_file).exists():
            with open(json_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Ошибка при чтении JSON файла: {e}")
        return []


def is_anime_exists(ttid, existing_anime):
    """Проверяет, существует ли аниме с данным TTID."""
    return any(anime["TTID"] == ttid for anime in existing_anime)


def save_to_mongodb(data, config):
    """Сохраняет данные в MongoDB Atlas."""
    try:
        client = MongoClient(config.MONGODB_URI)
        db = client[config.DB_NAME]
        collection = db[config.COLLECTION_NAME]

        collection.delete_many({})
        collection.insert_many(data)
        print(f"Успешно сохранено {len(data)} записей в MongoDB")

    except Exception as e:
        print(f"Ошибка при сохранении в MongoDB: {e}")
    finally:
        client.close()


def get_anilist_tags_and_genres(title, tags_file="available_tags.json", genres_file="available_genres.json"):
    """Получает и фильтрует теги, жанры и количество серий с AniList, используя переводы из JSON-файлов."""
    query = '''
    query ($search: String) {
        Media (search: $search, type: ANIME) {
            tags {
                name
            }
            genres
            episodes
        }
    }
    '''
    variables = {'search': title}
    url = 'https://graphql.anilist.co'

    try:
        response = requests.post(url, json={'query': query, 'variables': variables})
        data = response.json()

        if 'data' in data and 'Media' in data['data']:
            media = data['data']['Media']

            # Загрузка доступных тегов и жанров с переводами
            available_tags = load_json(tags_file)
            available_genres = load_json(genres_file)

            # Получаем теги, жанры и количество серий
            all_tags = [tag['name'] for tag in media.get('tags', [])]
            all_genres = media.get('genres', [])
            episodes = media.get('episodes', None)  # None, если данных нет

            # Фильтрация и перевод тегов и жанров
            filtered_tags = [available_tags.get(tag, tag) for tag in all_tags if tag in available_tags]
            filtered_genres = [available_genres.get(genre, genre) for genre in all_genres if genre in available_genres]

            return {
                "tags": filtered_tags,
                "genres": filtered_genres,
                "episodes": episodes
            }
    except Exception as e:
        print(f"Ошибка при получении данных с AniList для {title}: {e}")

    return {"tags": [], "genres": [], "episodes": None}

def load_json(file_path):
    """Загружает JSON-файл."""
    try:
        if Path(file_path).exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Ошибка при чтении {file_path}: {e}")
        return {}
# В основном скрипте добавляем загрузку тегов
if __name__ == "__main__":
    config = AnimeConfig(limit=1500, delay=2)

    # Загружаем доступные теги и жанры
    available_tags = load_json("available_tags.json")
    available_genres = load_json("available_genres.json")
    print(f"Загружено {len(available_tags)} доступных тегов")
    print(f"Загружено {len(available_genres)} доступных жанров")

    existing_anime = load_existing_anime(config.JSON_FILE)
    print(f"Найдено {len(existing_anime)} существующих аниме")

    needed_count = config.LIMIT - len(existing_anime)
    print(f"Требуется найти {needed_count} новых аниме")

    if needed_count > 0:
        print("Сбор данных на английском...")
        anime_english = get_anime_list(config, "en-US, en", existing_anime, needed_count)

        print("Сбор данных на русском...")
        anime_russian = get_anime_list(config, "ru-RU, ru", existing_anime, needed_count)

        new_data = []
        for eng, ru in zip(anime_english, anime_russian):
            # Получаем данные с TMDB
            tmdb_data = get_tmdb_data(eng["title"], config)

            # Получаем и фильтруем теги и жанры с AniList
            print(f"Получение тегов и жанров для {eng['title']}...")
            anilist_data = get_anilist_tags_and_genres(eng["title"])

            new_data.append({
                "ID": len(existing_anime) + len(new_data) + 1,
                "TitleEng": eng["title"],
                "TitleRu": ru["title"],
                "URL": f"https://m.imdb.com/title/{eng['ttid']}",
                "TTID": eng["ttid"],
                "Year": eng["year"],
                "IMDbRating": eng["rating"],
                "TMDbRating": tmdb_data["tmdb_rating"],
                "Status": tmdb_data["status"],
                "PosterRu": tmdb_data["poster_path"],
                "Backdrop": tmdb_data["backdrop_path"],
                "OverviewRu": tmdb_data["overview_ru"],
                "Episodes": anilist_data["episodes"],
                "Tags": anilist_data["tags"],
                "Genres": anilist_data["genres"]
            })
            time.sleep(config.DELAY)  # Задержка между запросами

        combined_data = existing_anime + new_data

        with open(config.JSON_FILE, "w", encoding="utf-8") as f:
            json.dump(combined_data, f, ensure_ascii=False, indent=4)
        print(f"Данные сохранены в {config.JSON_FILE} (всего {len(combined_data)} записей)")

        save_to_mongodb(combined_data, config)
    else:
        print("Достигнут желаемый лимит аниме, новые данные не требуются")
