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
  Title: String,
  TitleEng: String,
  Poster: String,
  imdbID: String, // Предполагаю, что это TTID
  Year: String,
  imdbRating: String,
  TMDbRating: Number,
  Status: String,
  Backdrop: String,
  OverviewRu: String,
  Tags: [String],
  Genre: String, // В схеме указано Genre, а не Genres — исправлю ниже
}, { collection: 'anime_list' });

const Anime = mongoose.model('Anime', animeSchema);

app.use(cors({
  origin: ['http://localhost:5173', 'https://animeinc.vercel.app'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Маршрут для получения списка аниме с фильтрацией дубликатов
app.get('/api/anime', async (req, res) => {
  try {
    const { genre, search, fields, limit, sort } = req.query;
    console.log('📌 Получен запрос с параметрами:', { genre, search, fields, limit, sort });

    let query = {};
    // Исправлено: используем Genre вместо Genres, согласно схеме
    if (genre) query.Genre = { $in: [genre] };
    if (search) query.Title = { $regex: new RegExp(search, 'i') };

    console.log('📌 Сформирован запрос к MongoDB:', query);

    let dbQuery = Anime.find(query);
    if (fields) dbQuery = dbQuery.select(fields.split(',').join(' '));
    if (limit) dbQuery = dbQuery.limit(parseInt(limit));
    if (sort) dbQuery = dbQuery.sort(sort);

    // Получаем все результаты
    const animeList = await dbQuery;

    // Фильтруем дубликаты по imdbID (или TTID)
    const uniqueAnime = Array.from(new Map(animeList.map(item => [item.imdbID, item])).values());
    
    console.log(`📌 Найдено записей: ${animeList.length}, после фильтрации дубликатов: ${uniqueAnime.length}`);
    res.json(uniqueAnime);
  } catch (error) {
    console.error('❌ Ошибка при получении аниме:', error);
    res.status(500).json({ error: 'Ошибка при получении аниме' });
  }
});

// Информация об аниме по TTID
app.get('/api/anime/:imdbID', async (req, res) => {
  try {
    const { imdbID } = req.params;
    console.log('📌 Запрос аниме с TTID:', imdbID);

    // Используем imdbID вместо TTID, если это поле используется как идентификатор
    const anime = await Anime.findOne({ imdbID: imdbID });
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
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AniList API ответил статусом: ${response.status}`);
    }

    const data = await response.json();
    console.log('📌 Ответ от AniList:', data);

    const anilistMedia = data.data?.Page?.media || [];
    const enhancedMedia = await Promise.all(
      anilistMedia.map(async (anime) => {
        const dbAnime = await Anime.findOne({ Title: anime.title.romaji });
        return {
          ...anime,
          imdbID: dbAnime?.imdbID || null, // Используем imdbID вместо TTID
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