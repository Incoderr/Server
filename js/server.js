require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB');
  mongoose.connection.db.listCollections().toArray((err, collections) => {
    if (err) {
      console.error('❌ Ошибка при получении списка коллекций:', err);
    } else {
      console.log('📌 Коллекции в базе данных:', collections.map(col => col.name));
    }
  });
}).catch(err => console.error('❌ MongoDB connection error:', err));

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
  Genres: [String]
}, { collection: 'anime_list' });

const Anime = mongoose.model('Anime', animeSchema);

app.use(cors());
app.use(express.json());

// Список аниме
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

module.exports = app; // ❗ Экспортируем app, не вызываем app.listen()
