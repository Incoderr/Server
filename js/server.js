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

// Глобальный Set для отслеживания использованных ID
let usedIds = new Set();

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

// Функция объединения данных с учетом уникальности
const combineWithMongoData = async (anilistData, limit) => {
  const result = [];
  for (const anime of anilistData) {
    if (usedIds.has(anime.id)) continue; // Пропускаем уже использованные

    // Ищем совпадение в MongoDB
    const dbAnime = await Anime.findOne({
      $or: [
        { TitleRu: { $regex: new RegExp(`^${anime.title.romaji}$`, 'i') } },
        { TitleEng: { $regex: new RegExp(`^${anime.title.english}$`, 'i') } },
      ],
    });

    const uniqueId = anime.id;
    usedIds.add(uniqueId);

    // Формируем объект результата
    const combinedAnime = {
      id: uniqueId,
      titleRu: dbAnime?.TitleRu || anime.title.romaji || "Название отсутствует",
      titleEng: dbAnime?.TitleEng || anime.title.english || null,
      episodes: dbAnime?.Episodes || anime.episodes || "??",
      year: dbAnime?.Year || null,
      rating: dbAnime?.TMDbRating || dbAnime?.IMDbRating || (anime.averageScore ? anime.averageScore / 10 : "N/A"),
      description: dbAnime?.OverviewRu || anime.description || "Описание отсутствует",
      poster: dbAnime?.PosterRu || anime.coverImage.large || "https://via.placeholder.com/500x750?text=Нет+постера",
      backdrop: dbAnime?.Backdrop || "https://via.placeholder.com/1920x1080?text=Нет+фона",
      ttid: dbAnime?.TTID || null,
      genres: dbAnime?.Genres || [],
      status: dbAnime?.Status || null,
    };

    result.push(combinedAnime);
    if (result.length >= limit) break; // Ограничиваем количество
  }

  return result;
};

// Маршрут для получения данных
app.get('/api/combined', async (req, res) => {
  try {
    const { sort = 'TRENDING_DESC', perPage = 5 } = req.query;
    const perPageNum = parseInt(perPage);

    // Получаем данные с AniList
    const anilistData = await fetchAnilistData(sort, perPageNum * 2); // Берем больше данных для запаса
    console.log(`Fetched ${anilistData.length} items from AniList with sort ${sort}`);

    // Комбинируем с MongoDB, исключая повторы
    const combinedData = await combineWithMongoData(anilistData, perPageNum);

    console.log(`Returning ${combinedData.length} unique items for sort ${sort}`);
    res.json(combinedData);
  } catch (error) {
    console.error('❌ Ошибка в /api/combined:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Маршрут для сброса usedIds (для тестирования или нового запроса страницы)
app.get('/api/reset-ids', (req, res) => {
  usedIds.clear();
  console.log('✅ Used IDs reset');
  res.json({ message: 'Used IDs reset' });
});

module.exports = app;