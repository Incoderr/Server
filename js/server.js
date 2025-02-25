require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = require('node-fetch'); // Добавляем node-fetch для запросов к AniList

const app = express();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    mongoose.connection.db.listCollections().toArray((err, collections) => {
      if (err) {
        console.error('❌ Ошибка при получении списка коллекций:', err);
      } else {
        console.log('📌 Коллекции в базе данных:', collections.map(col => col.name));
      }
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

const animeSchema = new mongoose.Schema({
  TitleRu: String,
  TitleEng: String,
  PosterRu: String,
  TTID: String,
  Year: String,
  IMDbRating: String,
  TMDbRating: Number,
  Status: String,
  Backdrop: String,
  OverviewRu: String,
  Tags: [String],
  Genres: [String],
}, { collection: 'anime_list' });

const Anime = mongoose.model('Anime', animeSchema);

app.use(cors());
app.use(express.json());

// Список аниме из вашей базы
app.get('/api/anime', async (req, res) => {
  try {
    const { genre, search } = req.query;
    console.log('📌 Получен запрос с параметрами:', { genre, search });

    let query = {};
    if (genre) {
      query.Genres = { $in: [genre] };
    }
    if (search) {
      query.TitleRu = { $regex: new RegExp(search, 'i') };
    }

    console.log('📌 Сформирован запрос к MongoDB:', query);

    const animeList = await Anime.find(query, 'TitleRu PosterRu Genres TTID');
    console.log(`📌 Найдено:`, animeList.length);
    res.json(animeList);
  } catch (error) {
    console.error('❌ Ошибка при получении аниме:', error);
    res.status(500).json({ error: 'Ошибка при получении аниме' });
  }
});

// Информация об аниме по TTID
app.get('/api/anime/:ttid', async (req, res) => {
  try {
    const { ttid } = req.params;
    console.log('📌 Запрос аниме с TTID:', ttid);

    const anime = await Anime.findOne({ TTID: ttid });
    if (!anime) {
      return res.status(404).json({ error: 'Аниме не найдено' });
    }

    console.log('📌 Найдено аниме:', anime);
    res.json(anime);
  } catch (error) {
    console.error('❌ Ошибка при получении аниме:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Новый эндпоинт для проксирования запросов к AniList API
app.post('/api/anilist', async (req, res) => {
  try {
    const { query, variables } = req.body; // Получаем GraphQL-запрос от клиента

    console.log('📌 Запрос к AniList:', { query, variables });

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      timeout: 7000, // 5 секунд
    });

    if (!response.ok) {
      throw new Error(`AniList API ответил статусом: ${response.status}`);
    }

    const data = await response.json();
    console.log('📌 Ответ от AniList:', data);

    // (Опционально) Интеграция с вашей базой MongoDB
    const anilistMedia = data.data?.Page?.media || [];
    const enhancedMedia = await Promise.all(
      anilistMedia.map(async (anime) => {
        const dbAnime = await Anime.findOne({ TitleRu: anime.title.romaji }); // Пример сопоставления по названию
        return {
          ...anime,
          ttid: dbAnime?.TTID || null, // Добавляем TTID из вашей базы, если есть
          backdrop: dbAnime?.Backdrop || null, // Добавляем фон из базы
        };
      })
    );

    res.json({ ...data, data: { ...data.data, Page: { ...data.data.Page, media: enhancedMedia } } });
  } catch (error) {
    console.error('❌ Ошибка при запросе к AniList:', error);
    res.status(500).json({ error: 'Ошибка при запросе к AniList' });
  }
});

module.exports = app; // Экспортируем app для Vercel