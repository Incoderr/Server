require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = require('node-fetch');

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

app.use(cors({
  origin: ['http://localhost:5173', 'https://animeinc.vercel.app/'], // Разрешаем запросы с вашего локального фронтенда
  methods: ['GET', 'POST'], // Указываем разрешенные методы
  allowedHeaders: ['Content-Type'], // Указываем разрешенные заголовки
}));
app.use(express.json());

// В вашем серверном файле (например, index.js)
app.get('/api/anime', async (req, res) => {
  try {
    const { genre, search, fields, limit, sort } = req.query;
    console.log('📌 Получен запрос с параметрами:', { genre, search, fields, limit, sort });

    let query = {};
    if (genre) query.Genres = { $in: [genre] };
    if (search) query.TitleRu = { $regex: new RegExp(search, 'i') };

    console.log('📌 Сформирован запрос к MongoDB:', query);

    let dbQuery = Anime.find(query);
    if (fields) dbQuery = dbQuery.select(fields.split(',').join(' '));
    if (limit) dbQuery = dbQuery.limit(parseInt(limit));
    if (sort) dbQuery = dbQuery.sort(sort); // Например, "TMDbRating" или "-TMDbRating"

    const animeList = await dbQuery;
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

// Прокси для AniList API
app.post('/api/anilist', async (req, res) => {
  try {
    const { query, variables } = req.body;
    console.log('📌 Запрос к AniList:', { query, variables });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Таймаут 8 секунд

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal, // Добавляем сигнал для отмены
    });

    clearTimeout(timeoutId); // Очищаем таймаут, если запрос успешен

    if (!response.ok) {
      throw new Error(`AniList API ответил статусом: ${response.status}`);
    }

    const data = await response.json();
    console.log('📌 Ответ от AniList:', data);

    // (Опционально) Обогащение данными из MongoDB
    const anilistMedia = data.data?.Page?.media || [];
    const enhancedMedia = await Promise.all(
      anilistMedia.map(async (anime) => {
        const dbAnime = await Anime.findOne({ TitleRu: anime.title.romaji });
        return {
          ...anime,
          ttid: dbAnime?.TTID || null,
          backdrop: dbAnime?.Backdrop || null,
        };
      })
    );

    res.json({ ...data, data: { ...data.data, Page: { ...data.data.Page, media: enhancedMedia } } });
  } catch (error) {
    console.error('❌ Ошибка при запросе к AniList:', error.message);
    if (error.name === 'AbortError') {
      res.status(504).json({ error: 'Запрос к AniList превысил время ожидания' });
    } else {
      res.status(500).json({ error: 'Ошибка при запросе к AniList' });
    }
  }
});

module.exports = app;