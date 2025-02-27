import json
import time
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from pathlib import Path

# Загрузка переменных окружения
load_dotenv()


class AnimeConfig:
    def __init__(self, delay=1, input_file="anime_ttid_list.json", output_file="anime_full_data.json"):
        self.DELAY = delay  # Задержка между запросами к OMDB (секунды)
        self.MONGODB_URI = os.getenv('MONGODB_URI')
        self.DB_NAME = os.getenv('DB_NAME', 'anime_db')
        self.COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'anime_full_data')
        self.OMDB_API_KEY = os.getenv('OMDB_API_KEY')  # Убедитесь, что ключ добавлен в .env
        self.INPUT_FILE = input_file  # Файл с TTID
        self.OUTPUT_FILE = output_file  # Файл для сохранения полной информации


def fetch_omdb_data(ttid, api_key, delay):
    """Получает данные по TTID из OMDB API."""
    url = f"http://www.omdbapi.com/?i={ttid}&apikey={api_key}"

    try:
        response = requests.get(url)
        data = response.json()

        if data.get("Response") == "True":
            print(f"Успешно получены данные для {ttid}")
            return data
        else:
            print(f"Ошибка OMDB для {ttid}: {data.get('Error', 'Неизвестная ошибка')}")
            return None

    except Exception as e:
        print(f"Ошибка запроса для {ttid}: {e}")
        return None


def load_ttids(json_file):
    """Читает TTID из JSON-файла."""
    try:
        if Path(json_file).exists():
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return [item["ttid"] for item in data]
        print(f"Файл {json_file} не найден")
        return []
    except Exception as e:
        print(f"Ошибка при чтении {json_file}: {e}")
        return []


def save_to_json(data, output_file):
    """Сохраняет данные в JSON-файл."""
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Сохранено {len(data)} записей в {output_file}")
    except Exception as e:
        print(f"Ошибка при сохранении в {output_file}: {e}")


def save_to_mongodb(data, config):
    """Сохраняет данные в MongoDB Atlas."""
    try:
        client = MongoClient(config.MONGODB_URI)
        db = client[config.DB_NAME]
        collection = db[config.COLLECTION_NAME]
        collection.delete_many({})  # Очищаем коллекцию перед записью
        collection.insert_many(data)
        print(f"Сохранено {len(data)} записей в MongoDB")
    except Exception as e:
        print(f"Ошибка при сохранении в MongoDB: {e}")
    finally:
        client.close()


def process_ttids(config):
    """Обрабатывает TTID через OMDB и собирает полные данные."""
    ttids = load_ttids(config.INPUT_FILE)
    if not ttids:
        print("Нет TTID для обработки")
        return

    full_data = []
    processed_count = 0

    for ttid in ttids:
        omdb_data = fetch_omdb_data(ttid, config.OMDB_API_KEY, config.DELAY)
        if omdb_data:
            # Добавляем TTID в данные для удобства
            omdb_data["ttid"] = ttid
            full_data.append(omdb_data)
            processed_count += 1

        # Задержка между запросами, чтобы не превысить лимит OMDB (1000 запросов в день для бесплатного ключа)
        time.sleep(config.DELAY)

        # Промежуточное сохранение каждые 100 записей
        if processed_count % 100 == 0:
            save_to_json(full_data, config.OUTPUT_FILE)
            print(f"Промежуточное сохранение: обработано {processed_count} из {len(ttids)}")

    # Финальное сохранение
    save_to_json(full_data, config.OUTPUT_FILE)
    save_to_mongodb(full_data, config)


if __name__ == "__main__":
    config = AnimeConfig(delay=1)  # Задержка 1 секунда для соблюдения лимитов OMDB

    if not config.OMDB_API_KEY:
        print("Ошибка: OMDB_API_KEY не указан в .env файле")
    else:
        print(f"Начинаем обработку {config.INPUT_FILE} через OMDB API...")
        process_ttids(config)