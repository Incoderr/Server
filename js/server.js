require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://animeinc.vercel.app'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Подключение к MongoDB
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

// Схема пользователя
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favorites: [{ type: String }], // массив ID избранного
  avatar: { type: String, default: 'https://i.imgur.com/hepj9ZS.png' }
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

// Схема аниме (оставляем как есть)
const animeSchema = new mongoose.Schema({
  Title: String,
  TitleEng: String,
  Poster: String,
  imdbID: String,
  Year: String,
  imdbRating: String,
  TMDbRating: Number,
  Status: String,
  Backdrop: String,
  OverviewRu: String,
  Tags: [String],
  Genre: String,
}, { collection: 'anime_list' });

const Anime = mongoose.model('Anime', animeSchema);

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// Middleware для аутентификации
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Требуется авторизация' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Недействительный токен' });
    req.user = user;
    next();
  });
};

// Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { login: username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();
    
    const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY);
    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        avatar: user.avatar 
      }
    });
  } catch (error) {
    res.status(400).json({ message: 'Ошибка регистрации', error: error.message });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const user = await User.findOne({
      $or: [{ username: login }, { email: login }]
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Неверные данные' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY);
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        avatar: user.avatar 
      }
    });
  } catch (error) {
    res.status(400).json({ message: 'Ошибка входа', error: error.message });
  }
});

// Профиль
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: 'Ошибка получения профиля' });
  }
});

// Добавление в избранное
app.post('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { imdbID } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user.favorites.includes(imdbID)) {
      user.favorites.push(imdbID);
      await user.save();
    }
    
    res.json({ success: true, favorites: user.favorites }); // Минимальный ответ
  } catch (error) {
    res.status(400).json({ success: false, message: 'Ошибка при добавлении в избранное', error: error.message });
  }
});

// Удаление из избранного
app.delete('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { imdbID } = req.body;
    const user = await User.findById(req.user.id);
    
    if (user.favorites.includes(imdbID)) {
      user.favorites = user.favorites.filter(id => id !== imdbID);
      await user.save();
    }
    
    res.json({ success: true, favorites: user.favorites }); // Минимальный ответ
  } catch (error) {
    res.status(400).json({ success: false, message: 'Ошибка при удалении из избранного', error: error.message });
  }
});

// Существующие маршруты для аниме
app.get('/api/anime', async (req, res) => {
  try {
    const { genre, search, fields, limit, sort } = req.query;
    let query = {};
    if (genre) query.Genre = { $regex: new RegExp(genre, 'i') };
    if (search) query.Title = { $regex: new RegExp(search, 'i') };

    let dbQuery = Anime.find(query);
    if (fields) dbQuery = dbQuery.select(fields.split(',').join(' '));
    if (limit) dbQuery = dbQuery.limit(parseInt(limit));
    if (sort) dbQuery = dbQuery.sort(sort);

    const animeList = await dbQuery;
    const uniqueAnime = Array.from(new Map(animeList.map(item => [item.imdbID, item])).values());
    res.json(uniqueAnime);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении аниме' });
  }
});

app.get('/api/anime/:imdbID', async (req, res) => {
  try {
    const { imdbID } = req.params;
    const anime = await Anime.findOne({ imdbID });
    if (!anime) return res.status(404).json({ error: 'Аниме не найдено' });
    res.json(anime);
  } catch (error) {
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