// index.js (сервер)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
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

app.use(cors({ origin: ['http://localhost:5173', 'https://animeinc.vercel.app'], methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

// Функция запроса к AniList
const fetchAnilistData = async (sort, perPage) => {
  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: $sort) {
          id
          title { romaji english native }
          description(asHtml: false)
          coverImage { extraLarge large medium }
          averageScore
          episodes
          popularity
        }
      }
    }
  `;
  const variables = { page: 1, perPage, sort: [sort] };

  console.log('📌 Запрос к AniList:', { query, variables });
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) throw new Error(`AniList API error: ${response.status}`);
  const json = await response.json();
  console.log('📌 Ответ от AniList:', json.data.Page.media.length, 'элементов');
  return json.data.Page.media;
};

const filterAndUseMongoData = async (anilistData, dbQueryParams) => {
  const { fields, limit, sort } = dbQueryParams;
  let dbQuery = Anime.find({});
  if (fields) dbQuery = dbQuery.select(fields.split(',').join(' '));
  if (limit) dbQuery = dbQuery.limit(parseInt(limit));
  if (sort) dbQuery = dbQuery.sort(sort);

  const myDatabase = await dbQuery;
  console.log('📌 Данные из MongoDB:', myDatabase.length, 'элементов');

  const seenIds = new Set();
  const result = myDatabase
    .map(dbAnime => {
      const anilistEntry = anilistData.find(anime => 
        (dbAnime.TitleRu && anime.title.romaji && dbAnime.TitleRu.toLowerCase() === anime.title.romaji.toLowerCase()) ||
        (dbAnime.TitleEng && anime.title.english && dbAnime.TitleEng.toLowerCase() === anime.title.english.toLowerCase())
      );
      const uniqueId = anilistEntry?.id || dbAnime.TTID || Date.now() + Math.random();
      if (seenIds.has(uniqueId)) return null;
      seenIds.add(uniqueId);

      return {
        id: uniqueId,
        titleRu: dbAnime.TitleRu || "Название отсутствует",
        titleEng: dbAnime.TitleEng || null,
        episodes: dbAnime.Episodes || "??",
        year: dbAnime.Year || null,
        rating: dbAnime.TMDbRating || dbAnime.IMDbRating || "N/A",
        description: dbAnime.OverviewRu || "Описание отсутствует",
        poster: dbAnime.PosterRu || "https://via.placeholder.com/500x750?text=Нет+постера",
        backdrop: dbAnime.Backdrop || "https://via.placeholder.com/1920x1080?text=Нет+фона",
        ttid: dbAnime.TTID || null,
        genres: dbAnime.Genres || [],
        status: dbAnime.Status || null,
      };
    })
    .filter(Boolean);

  console.log('📌 Результат фильтрации:', result.length, 'элементов');
  return result;
};

app.get('/api/combined', async (req, res) => {
  try {
    const { sort = 'TRENDING_DESC', perPage = 5, fields, limit, dbSort } = req.query;
    console.log('📌 Параметры запроса /api/combined:', { sort, perPage, fields, limit, dbSort });

    const anilistData = await fetchAnilistData(sort, parseInt(perPage));
    const dbQueryParams = {
      fields: fields || "TitleRu,TitleEng,Episodes,Year,TMDbRating,IMDbRating,OverviewRu,PosterRu,Backdrop,TTID,Genres,Status",
      limit: limit || perPage,
      sort: dbSort || null,
    };
    const combinedData = await filterAndUseMongoData(anilistData, dbQueryParams);

    console.log('📌 Отправляем данные фронтенду:', combinedData.length, 'элементов');
    res.json(combinedData.slice(0, parseInt(perPage)));
  } catch (error) {
    console.error('❌ Ошибка в /api/combined:', error.message);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});


// Существующие маршруты остаются без изменений
app.get('/api/anime', async (req, res) => { /* ... */ });
app.get('/api/anime/:ttid', async (req, res) => { /* ... */ });
app.post('/api/anilist', async (req, res) => { /* ... */ });

module.exports = app;