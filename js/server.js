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

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) throw new Error(`AniList API error: ${response.status}`);
  const json = await response.json();
  return json.data.Page.media;
};

// Функция обогащения данных из MongoDB с учетом уникальности
const enrichWithMongoData = async (anilistData, dbQueryParams, usedIds) => {
  const { fields, limit } = dbQueryParams;
  let dbQuery = Anime.find({});
  if (fields) dbQuery = dbQuery.select(fields.split(',').join(' '));
  if (limit) dbQuery = dbQuery.limit(parseInt(limit));

  const myDatabase = await dbQuery;

  const result = [];
  for (const anilistAnime of anilistData) {
    const dbAnime = myDatabase.find(db => 
      (db.TitleRu && anilistAnime.title.romaji && db.TitleRu.toLowerCase() === anilistAnime.title.romaji.toLowerCase()) ||
      (db.TitleEng && anilistAnime.title.english && db.TitleEng.toLowerCase() === anilistAnime.title.english.toLowerCase())
    );

    const uniqueId = anilistAnime.id || (dbAnime?.TTID ?? Date.now() + Math.random());
    if (usedIds.has(uniqueId)) continue; // Пропускаем, если ID уже использован

    usedIds.add(uniqueId);
    result.push({
      id: uniqueId,
      titleRu: dbAnime?.TitleRu || anilistAnime.title.romaji || "Название отсутствует",
      titleEng: dbAnime?.TitleEng || anilistAnime.title.english || null,
      episodes: dbAnime?.Episodes || anilistAnime.episodes || "??",
      year: dbAnime?.Year || null,
      rating: dbAnime?.TMDbRating || dbAnime?.IMDbRating || (anilistAnime.averageScore / 10) || "N/A",
      description: dbAnime?.OverviewRu || anilistAnime.description || "Описание отсутствует",
      poster: dbAnime?.PosterRu || anilistAnime.coverImage.large || "https://via.placeholder.com/500x750?text=Нет+постера",
      backdrop: dbAnime?.Backdrop || "https://via.placeholder.com/1920x1080?text=Нет+фона",
      ttid: dbAnime?.TTID || null,
      genres: dbAnime?.Genres || [],
      status: dbAnime?.Status || null,
    });

    if (result.length >= dbQueryParams.perPage) break; // Ограничиваем результат
  }

  return result;
};

// Маршрут для всех категорий с уникальными данными
app.get('/api/combined-all', async (req, res) => {
  try {
    const categories = [
      { sort: 'TRENDING_DESC', perPage: 5, label: 'trending' }, // Для MainSwiper
      { sort: 'POPULARITY_DESC', perPage: 20, label: 'popular' },
      { sort: 'TRENDING_DESC', perPage: 20, label: 'trending_slider' },
      { sort: 'START_DATE_DESC', perPage: 20, label: 'new' },
      { sort: 'SCORE_DESC', perPage: 10, label: 'top10' },
    ];

    const usedIds = new Set(); // Отслеживаем использованные ID
    const result = {};

    for (const category of categories) {
      const anilistData = await fetchAnilistData(category.sort, category.perPage * 2); // Берем больше данных для выбора
      const dbQueryParams = {
        fields: "TitleRu,TitleEng,Episodes,Year,TMDbRating,IMDbRating,OverviewRu,PosterRu,Backdrop,TTID,Genres,Status",
        limit: category.perPage * 2,
        perPage: category.perPage,
      };
      const enrichedData = await enrichWithMongoData(anilistData, dbQueryParams, usedIds);
      result[category.label] = enrichedData.slice(0, category.perPage); // Ограничиваем до нужного количества
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка в /api/combined-all:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = app;