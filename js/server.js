require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const axios = require('axios');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { gql } = require('graphql-tag');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://animeinc.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.options('*', cors());

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
  favorites: [{ type: String }],
  avatar: { type: String, default: "https://i.ibb.co.com/Zyn02g6/avatar-default.webp" },
  role: { type: String, default: "user", enum: ["user", "admin"] },
  watchStatus: [
    {
      imdbID: { type: String, required: true },
      status: {
        type: String,
        enum: ["plan_to_watch", "watching", "completed", "dropped"],
        default: "plan_to_watch",
      },
    },
  ],
}, { collection: "users" });

const User = mongoose.model('User', userSchema);

// Схема аниме
const animeSchema = new mongoose.Schema({
  Title: { type: String, required: true },
  TitleEng: { type: String, required: true },
  Poster: { type: String, required: true },
  Backdrop: { type: String },
  Year: { type: String, required: true },
  Released: { type: String, required: true },
  imdbRating: { type: String },
  imdbID: { type: String, required: true, unique: true },
  Episodes: { type: Number },
  Genre: { type: [String], required: true, default: [] },
  Tags: { type: [String], default: [] },
  OverviewRu: { type: String, required: true },
}, { collection: 'anime_list' });

const Anime = mongoose.model('Anime', animeSchema);

// Схема дружбы
const friendshipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  friendId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
}, { timestamps: true });

const Friendship = mongoose.model("Friendship", friendshipSchema);

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

// Middleware для проверки роли админа
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }
  next();
};

// Функция проверки токена Turnstile
const verifyTurnstileToken = async (token) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || 'YOUR_TURNSTILE_SECRET_KEY';
  try {
    const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      secret: secretKey,
      response: token,
    });
    return response.data.success;
  } catch (error) {
    console.error('Ошибка проверки Turnstile:', error.message);
    return false;
  }
};

// REST API: Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { login: username, email, password, turnstileToken, role = 'user' } = req.body;

    if (!turnstileToken) {
      return res.status(400).json({ message: 'Требуется проверка капчи' });
    }
    const isValidCaptcha = await verifyTurnstileToken(turnstileToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ message: 'Ошибка проверки капчи' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Недопустимая роль. Доступные роли: user, admin' });
    }

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Все поля (username, email, password) обязательны' });
    }

    // Используем argon2 для хеширования пароля
    const hashedPassword = await argon2.hash(password);
    const user = new User({ username, email, password: hashedPassword, role });
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      SECRET_KEY,
    );

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, avatar: user.avatar, role: user.role },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ message: `Этот ${field} уже зарегистрирован` });
    }
    console.error('Ошибка регистрации:', error.message);
    res.status(400).json({ message: 'Ошибка регистрации', error: error.message });
  }
});

// REST API: Вход
app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ message: 'Логин и пароль обязательны' });
    }

    const user = await User.findOne({
      $or: [{ username: login }, { email: login }],
    });

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    // Проверяем пароль с помощью argon2
    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверный пароль' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      SECRET_KEY,
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, avatar: user.avatar, role: user.role },
    });
  } catch (error) {
    console.error('Ошибка входа:', error.message);
    res.status(400).json({ message: 'Ошибка входа', error: error.message });
  }
});

// REST API: Профиль текущего пользователя
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const favorites = user.favorites || [];
    const favoritesData = await Promise.all(
      favorites.map((imdbID) => Anime.findOne({ imdbID }).catch(() => null))
    ).then(results => results.filter(Boolean));
    res.json({ ...user.toObject(), favoritesData });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// REST API: Профиль по username
app.get("/api/profile/:username", authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username })
      .select("username avatar role favorites watchStatus");
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const isCurrentUser = req.user.username === username;
    const friendship = await Friendship.findOne({
      $or: [
        { userId: req.user.id, friendId: user._id, status: "accepted" },
        { userId: user._id, friendId: req.user.id, status: "accepted" },
      ],
    });

    if (!isCurrentUser && !friendship) {
      return res.status(403).json({ message: "Доступ запрещён: пользователь не является вашим другом" });
    }

    const favoritesData = await Promise.all(
      user.favorites.map((imdbID) =>
        Anime.findOne({ imdbID }).catch(() => null)
      )
    ).then((results) => results.filter(Boolean));

    const friends = await Friendship.find({
      $or: [{ userId: user._id }, { friendId: user._id }],
      status: "accepted",
    }).populate("userId friendId", "username avatar");

    const friendList = friends.map((f) =>
      f.userId._id.toString() === user._id.toString() ? f.friendId : f.userId
    );

    res.json({ ...user.toObject(), favoritesData, friends: friendList });
  } catch (error) {
    console.error("Ошибка при получении профиля:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// REST API: Поиск пользователя по username
app.get("/api/profile/search", authenticateToken, async (req, res) => {
  const { username } = req.query;
  try {
    const user = await User.findOne({ username }).select("username avatar _id");
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: "Нельзя добавить себя в друзья" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// REST API: Отправка запроса на дружбу
app.post("/api/friends/request", authenticateToken, async (req, res) => {
  const { friendUsername } = req.body;
  try {
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    if (friend._id.toString() === req.user.id) {
      return res.status(400).json({ message: "Нельзя добавить себя в друзья" });
    }

    const existingRequest = await Friendship.findOne({
      userId: req.user.id,
      friendId: friend._id,
    });
    if (existingRequest) {
      return res.status(400).json({ message: "Запрос уже отправлен" });
    }

    const friendship = new Friendship({
      userId: req.user.id,
      friendId: friend._id,
    });
    await friendship.save();
    res.status(201).json({ message: "Запрос на дружбу отправлен" });
  } catch (error) {
    console.error("Ошибка при отправке запроса на дружбу:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// REST API: Принятие запроса на дружбу
app.put("/api/friends/accept/:friendshipId", authenticateToken, async (req, res) => {
  const { friendshipId } = req.params;
  try {
    const friendship = await Friendship.findOne({ _id: friendshipId, friendId: req.user.id });
    if (!friendship) {
      return res.status(404).json({ message: "Запрос не найден" });
    }
    if (friendship.status !== "pending") {
      return res.status(400).json({ message: "Запрос уже обработан" });
    }

    friendship.status = "accepted";
    await friendship.save();
    res.json({ message: "Друг добавлен" });
  } catch (error) {
    console.error("Ошибка при принятии запроса на дружбу:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// REST API: Получение списка друзей и запросов
app.get("/api/friends", authenticateToken, async (req, res) => {
  try {
    const friends = await Friendship.find({
      $or: [{ userId: req.user.id }, { friendId: req.user.id }],
      status: "accepted",
    }).populate("userId friendId", "username avatar");

    const friendList = friends.map((f) =>
      f.userId._id.toString() === req.user.id ? f.friendId : f.userId
    );

    const pendingRequests = await Friendship.find({
      friendId: req.user.id,
      status: "pending",
    }).populate("userId", "username avatar");

    res.json({ friends: friendList, pendingRequests });
  } catch (error) {
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// REST API: Добавление в избранное
app.post('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { imdbID } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.favorites.includes(imdbID)) {
      user.favorites.push(imdbID);
      await user.save();
    }

    res.json({ success: true, favorites: user.favorites });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Ошибка при добавлении в избранное', error: error.message });
  }
});

// REST API: Удаление из избранного
app.delete('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { imdbID } = req.body;
    const user = await User.findById(req.user.id);

    if (user.favorites.includes(imdbID)) {
      user.favorites = user.favorites.filter(id => id !== imdbID);
      await user.save();
    }

    res.json({ success: true, favorites: user.favorites });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Ошибка при удалении из избранного', error: error.message });
  }
});

// REST API: Обновление состояния просмотра
app.put("/api/watch-status", authenticateToken, async (req, res) => {
  try {
    const { imdbID, status } = req.body;
    if (!imdbID || !status) {
      return res.status(400).json({ message: "imdbID и status обязательны" });
    }

    const validStatuses = ["plan_to_watch", "watching", "completed", "dropped"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Недопустимый статус" });
    }

    const user = await User.findById(req.user.id);
    const existingStatus = user.watchStatus.find((ws) => ws.imdbID === imdbID);

    if (existingStatus) {
      existingStatus.status = status;
    } else {
      user.watchStatus.push({ imdbID, status });
    }

    await user.save();
    res.json({ success: true, watchStatus: user.watchStatus });
  } catch (error) {
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// REST API: Статистика просмотра
app.get("/api/watch-status/stats", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const stats = {
      plan_to_watch: 0,
      watching: 0,
      completed: 0,
      dropped: 0,
    };

    user.watchStatus.forEach((ws) => {
      stats[ws.status]++;
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// REST API: Получение списка аниме
app.get('/api/anime', async (req, res) => {
  try {
    const { genre, search, fields, limit, sort } = req.query;
    let query = {};

    if (genre) {
      const genreArray = Array.isArray(genre)
        ? genre.map(g => g.trim())
        : genre.toString().split(',').map(g => g.trim()).filter(Boolean);
      query.Genre = { $in: genreArray }; // Используем genre как есть (ожидем "Sci-Fi")
    }

    if (search) {
      query.$or = [
        { Title: { $regex: new RegExp(search, 'i') } },
        { TitleEng: { $regex: new RegExp(search, 'i') } }
      ];
    }

    let dbQuery = Anime.find(query);
    if (fields) dbQuery = dbQuery.select(fields.split(',').join(' '));
    if (limit) dbQuery = dbQuery.limit(parseInt(limit) || 10);
    if (sort) dbQuery = dbQuery.sort(sort);

    const animeList = await dbQuery;
    const uniqueAnime = Array.from(
      new Map(
        animeList
          .filter(item => item.imdbID)
          .map(item => [item.imdbID, item])
      ).values()
    ).map(anime => ({
      ...anime.toObject(),
      Genre: Array.isArray(anime.Genre) ? anime.Genre : (anime.Genre ? [anime.Genre] : []),
    }));

    if (uniqueAnime.length === 0) return res.status(404).json({ message: 'Аниме не найдено' });
    res.json(uniqueAnime);
  } catch (error) {
    console.error('Ошибка при получении аниме:', error);
    res.status(500).json({ message: 'Ошибка при получении аниме', error });
  }
});

// REST API: Получение аниме по ID
app.get('/api/anime/:imdbID', async (req, res) => {
  try {
    const { imdbID } = req.params;
    const anime = await Anime.findOne({ imdbID });
    if (!anime) return res.status(404).json({ message: 'Аниме не найдено' });
    res.json(anime);
  } catch (error) {
    console.error('Ошибка при получении аниме:', error);
    res.status(500).json({ message: 'Ошибка сервера', error });
  }
});

// REST API: Прокси для AniList API
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
    const normalizeTitle = (title) => {
      if (!title) return '';
      return title
        .toLowerCase()
        .replace(/season \d+/g, '')
        .replace(/part \d+/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();
    };

    const titlesToSearch = anilistMedia.map(anime => ({
      romaji: normalizeTitle(anime.title.romaji),
      english: normalizeTitle(anime.title.english),
    }));

    const dbAnimeList = await Anime.find({}).select('Title TitleEng imdbID Backdrop Poster OverviewRu Episodes Year imdbRating Genre Status');

    const dbAnimeMap = new Map();
    dbAnimeList.forEach(dbAnime => {
      if (dbAnime.Title) dbAnimeMap.set(normalizeTitle(dbAnime.Title), dbAnime);
      if (dbAnime.TitleEng) dbAnimeMap.set(normalizeTitle(dbAnime.TitleEng), dbAnime);
    });

    const enhancedMedia = anilistMedia.map(anime => {
      const normalizedRomaji = normalizeTitle(anime.title.romaji);
      const normalizedEnglish = normalizeTitle(anime.title.english);

      const dbAnime = dbAnimeMap.get(normalizedRomaji) || dbAnimeMap.get(normalizedEnglish);

      if (!dbAnime) {
        for (const dbAnime of dbAnimeList) {
          const dbTitleNormalized = normalizeTitle(dbAnime.Title) || '';
          const dbTitleEngNormalized = normalizeTitle(dbAnime.TitleEng) || '';
          if (
            (normalizedRomaji && dbTitleNormalized.includes(normalizedRomaji)) ||
            (normalizedEnglish && dbTitleEngNormalized.includes(normalizedEnglish)) ||
            (normalizedRomaji && dbTitleEngNormalized.includes(normalizedRomaji)) ||
            (normalizedEnglish && dbTitleNormalized.includes(normalizedEnglish))
          ) {
            return {
              ...anime,
              title: { ru: dbAnime.Title, romaji: anime.title.romaji, english: anime.title.english, native: anime.title.native },
              imdbID: dbAnime.imdbID || null,
              backdrop: dbAnime.Backdrop || null,
              poster: dbAnime.Poster || anime.coverImage?.large,
              description: dbAnime.OverviewRu || anime.description,
              episodes: dbAnime.Episodes || anime.episodes,
              year: dbAnime.Year || null,
              rating: dbAnime.imdbRating || (anime.averageScore / 10),
              genres: dbAnime.Genre || [],
              status: dbAnime.Status || null,
            };
          }
        }
      }

      return {
        ...anime,
        title: { ru: dbAnime?.Title || anime.title.romaji || anime.title.english, romaji: anime.title.romaji, english: anime.title.english, native: anime.title.native },
        imdbID: dbAnime?.imdbID || null,
        backdrop: dbAnime?.Backdrop || null,
        poster: dbAnime?.Poster || anime.coverImage?.large,
        description: dbAnime?.OverviewRu || anime.description,
        episodes: dbAnime?.Episodes || anime.episodes,
        year: dbAnime?.Year || null,
        rating: dbAnime?.imdbRating || (anime.averageScore / 10),
        genres: dbAnime?.Genre || [],
        status: dbAnime?.Status || null,
      };
    });

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

// REST API: Admin маршруты
app.get('/api/admin/anime', authenticateToken, isAdmin, async (req, res) => {
  console.log('Admin request for anime list by user:', req.user);
  try {
    const animeList = await Anime.find().select('Title TitleEng Poster Backdrop Year Released imdbRating imdbID Episodes Genre Tags OverviewRu');
    res.json(animeList);
  } catch (error) {
    console.error('Ошибка при получении списка аниме:', error);
    res.status(500).json({ message: 'Ошибка при получении списка аниме', error });
  }
});

app.post('/api/admin/anime', authenticateToken, isAdmin, async (req, res) => {
  try {
    const animeData = req.body;
    if (!animeData.imdbID || !animeData.Title || !animeData.TitleEng || !animeData.Poster || !animeData.Year || !animeData.Released || !animeData.Genre || !animeData.OverviewRu) {
      return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
    }
    if (typeof animeData.Genre === 'string') {
      animeData.Genre = animeData.Genre.split(",").map(genre => genre.trim()).filter(Boolean);
    }
    if (animeData.Episodes) {
      animeData.Episodes = parseInt(animeData.Episodes) || 0;
    }
    if (typeof animeData.Tags === 'string') {
      animeData.Tags = animeData.Tags.split(",").map(tag => tag.trim()).filter(Boolean);
    }

    const newAnime = new Anime(animeData);
    await newAnime.save();
    res.status(201).json(newAnime);
  } catch (error) {
    console.error('Ошибка при добавлении аниме:', error);
    res.status(400).json({ message: 'Ошибка при добавлении аниме', error });
  }
});

app.put('/api/admin/anime/:imdbID', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { imdbID } = req.params;
    const updatedData = req.body;

    console.log('PUT /api/admin/anime/:imdbID - Received data:', updatedData);

    if (!updatedData.Title || !updatedData.TitleEng || !updatedData.Poster || !updatedData.Year || !updatedData.Released || !updatedData.OverviewRu) {
      return res.status(400).json({ message: 'Обязательные поля (Title, TitleEng, Poster, Year, Released, OverviewRu) должны быть заполнены' });
    }

    if (typeof updatedData.Genre === 'string') {
      updatedData.Genre = updatedData.Genre.split(",").map(genre => genre.trim()).filter(Boolean);
    }
    if (!updatedData.Genre || updatedData.Genre.length === 0) {
      return res.status(400).json({ message: 'Жанры (Genre) должны быть указаны' });
    }

    if (typeof updatedData.Tags === 'string') {
      updatedData.Tags = updatedData.Tags.split(",").map(tag => tag.trim()).filter(Boolean);
    }

    if (updatedData.Episodes !== undefined && updatedData.Episodes !== null) {
      updatedData.Episodes = parseInt(updatedData.Episodes) || 0;
    }

    if (updatedData.Backdrop === "") {
      updatedData.Backdrop = undefined;
    }
    if (updatedData.imdbRating === "") {
      updatedData.imdbRating = undefined;
    }

    delete updatedData._id;

    const allowedUpdates = {
      Title: updatedData.Title,
      TitleEng: updatedData.TitleEng,
      Poster: updatedData.Poster,
      Backdrop: updatedData.Backdrop,
      Year: updatedData.Year,
      Released: updatedData.Released,
      imdbRating: updatedData.imdbRating,
      Episodes: updatedData.Episodes,
      Genre: updatedData.Genre,
      Tags: updatedData.Tags,
      OverviewRu: updatedData.OverviewRu,
    };

    const updatedAnime = await Anime.findOneAndUpdate(
      { imdbID },
      allowedUpdates,
      { new: true, runValidators: true }
    );

    if (!updatedAnime) {
      return res.status(404).json({ message: 'Аниме не найдено' });
    }

    res.json(updatedAnime);
  } catch (error) {
    console.error('Ошибка при редактировании аниме:', error);
    res.status(400).json({ message: 'Ошибка при редактировании аниме', error: error.message });
  }
});

app.delete('/api/admin/anime/:imdbID', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { imdbID } = req.params;
    const deletedAnime = await Anime.findOneAndDelete({ imdbID });
    if (!deletedAnime) return res.status(404).json({ message: 'Аниме не найдено' });
    res.json({ message: 'Аниме удалено', imdbID });
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при удалении аниме', error });
  }
});

// REST API: Загрузка аватарки
app.put('/api/profile/avatar', authenticateToken, async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      return res.status(400).json({ message: 'URL аватара обязателен' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Ошибка при обновлении аватара:', error);
    res.status(500).json({ message: 'Ошибка при обновлении аватара' });
  }
});

// GraphQL: Определение схемы
const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    avatar: String
    role: String!
    favorites: [String!]!
    watchStatus: [WatchStatus!]!
    favoritesData: [Anime!]
  }

  type Anime {
    id: ID!
    Title: String!
    TitleEng: String!
    Poster: String!
    Backdrop: String
    Year: String!
    Released: String!
    imdbRating: String
    imdbID: String!
    Episodes: Int
    Genre: [String!]!
    Tags: [String!]!
    OverviewRu: String!
  }

  type WatchStatus {
    imdbID: String!
    status: String!
  }

  type Friendship {
    id: ID!
    userId: User!
    friendId: User!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type FriendsResponse {
    friends: [User!]!
    pendingRequests: [Friendship!]!
  }

  type WatchStats {
    plan_to_watch: Int!
    watching: Int!
    completed: Int!
    dropped: Int!
  }

  type AuthResponse {
    token: String!
    user: User!
  }

  type Query {
    profile: User!
    profileByUsername(username: String!): User
    searchUser(username: String!): User
    friends: FriendsResponse!
    anime(imdbID: String!): Anime
    animeList(genre: [String!], search: String, fields: [String!], limit: Int, sort: String): [Anime!]!
    watchStats: WatchStats!
  }

  type Mutation {
    register(login: String!, email: String!, password: String!, turnstileToken: String!, role: String): AuthResponse!
    login(login: String!, password: String!): AuthResponse!
    addFriend(friendUsername: String!): String!
    acceptFriend(friendshipId: ID!): String!
    addToFavorites(imdbID: String!): [String!]!
    removeFromFavorites(imdbID: String!): [String!]!
    updateWatchStatus(imdbID: String!, status: String!): [WatchStatus!]!
    updateAvatar(avatarUrl: String!): User!
  }
`;

// GraphQL: Резолверы
const resolvers = {
  Query: {
    profile: async (_, __, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      const foundUser = await User.findById(user.id).select('-password');
      const favorites = foundUser.favorites || [];
      const favoritesData = await Promise.all(
        favorites.map((imdbID) => Anime.findOne({ imdbID }).catch(() => null))
      ).then(results => results.filter(Boolean));
      return { ...foundUser.toObject(), favoritesData };
    },
    profileByUsername: async (_, { username }, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      const foundUser = await User.findOne({ username })
        .select("username avatar role favorites watchStatus");
      if (!foundUser) throw new Error("Пользователь не найден");

      const isCurrentUser = user.username === username;
      const friendship = await Friendship.findOne({
        $or: [
          { userId: user.id, friendId: foundUser._id, status: "accepted" },
          { userId: foundUser._id, friendId: user.id, status: "accepted" },
        ],
      });

      if (!isCurrentUser && !friendship) {
        throw new Error("Доступ запрещён: пользователь не является вашим другом");
      }

      const favoritesData = await Promise.all(
        foundUser.favorites.map((imdbID) =>
          Anime.findOne({ imdbID }).catch(() => null)
        )
      ).then((results) => results.filter(Boolean));

      const friends = await Friendship.find({
        $or: [{ userId: foundUser._id }, { friendId: foundUser._id }],
        status: "accepted",
      }).populate("userId friendId", "username avatar");

      const friendList = friends.map((f) =>
        f.userId._id.toString() === foundUser._id.toString() ? f.friendId : f.userId
      );

      return { ...foundUser.toObject(), favoritesData, friends: friendList };
    },
    searchUser: async (_, { username }, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      const foundUser = await User.findOne({ username }).select("username avatar _id");
      if (!foundUser) throw new Error("Пользователь не найден");
      if (foundUser._id.toString() === user.id) {
        throw new Error("Нельзя добавить себя в друзья");
      }
      return foundUser;
    },
    friends: async (_, __, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      const friends = await Friendship.find({
        $or: [{ userId: user.id }, { friendId: user.id }],
        status: "accepted",
      }).populate("userId friendId", "username avatar");

      const friendList = friends.map((f) =>
        f.userId._id.toString() === user.id ? f.friendId : f.userId
      );

      const pendingRequests = await Friendship.find({
        friendId: user.id,
        status: "pending",
      }).populate("userId", "username avatar");

      return { friends: friendList, pendingRequests };
    },
    anime: async (_, { imdbID }) => {
      const anime = await Anime.findOne({ imdbID });
      if (!anime) throw new Error('Аниме не найдено');
      return anime;
    },
    animeList: async (_, { genre, search, fields, limit, sort }) => {
      let query = {};

      if (genre) {
        const genreMapping = {
          "Экшен": "Action",
          "Приключения": "Adventure",
          "Комедия": "Comedy",
          "Драма": "Drama",
          "Этти": "Ecchi",
          "Фэнтези": "Fantasy",
          "Хоррор": "Horror",
          "Меха": "Mecha",
          "Музыка": "Music",
          "Детектив": "Mystery",
          "Психологическое": "Psychological",
          "Романтика": "Romance",
          "Научная_фантастика": "Sci-Fi",
          "Повседневность": "Slice of Life",
          "Спорт": "Sports",
          "Сверхъестественное": "Supernatural",
          "Триллер": "Thriller",
        };
        const englishGenres = genre.map(g => genreMapping[g] || g);
        query.Genre = { $in: englishGenres };
      }

      if (search) {
        query.$or = [
          { Title: { $regex: new RegExp(search, 'i') } },
          { TitleEng: { $regex: new RegExp(search, 'i') } }
        ];
      }

      let dbQuery = Anime.find(query);
      if (fields) dbQuery = dbQuery.select(fields.join(' '));
      if (limit) dbQuery = dbQuery.limit(limit);
      if (sort) dbQuery = dbQuery.sort(sort);

      const animeList = await dbQuery;
      const uniqueAnime = Array.from(
        new Map(
          animeList
            .filter(item => item.imdbID)
            .map(item => [item.imdbID, item])
        ).values()
      ).map(anime => ({
        ...anime.toObject(),
        Genre: Array.isArray(anime.Genre) ? anime.Genre : (anime.Genre ? [anime.Genre] : []),
      }));

      if (uniqueAnime.length === 0) throw new Error('Аниме не найдено');
      return uniqueAnime;
    },
    watchStats: async (_, __, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      const foundUser = await User.findById(user.id);
      const stats = {
        plan_to_watch: 0,
        watching: 0,
        completed: 0,
        dropped: 0,
      };

      foundUser.watchStatus.forEach((ws) => {
        stats[ws.status]++;
      });

      return stats;
    },
  },
  Mutation: {
    register: async (_, { login, email, password, turnstileToken, role }) => {
      if (!turnstileToken) throw new Error('Требуется проверка капчи');
      const isValidCaptcha = await verifyTurnstileToken(turnstileToken);
      if (!isValidCaptcha) throw new Error('Ошибка проверки капчи');

      if (role && !['user', 'admin'].includes(role)) {
        throw new Error('Недопустимая роль. Доступные роли: user, admin');
      }

      if (!login || !email || !password) {
        throw new Error('Все поля (login, email, password) обязательны');
      }

      const hashedPassword = await argon2.hash(password);
      const user = new User({ username: login, email, password: hashedPassword, role: role || 'user' });
      await user.save();

      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        SECRET_KEY,
      );

      return {
        token,
        user: { ...user.toObject(), id: user._id, favorites: user.favorites || [], watchStatus: user.watchStatus || [] },
      };
    },
    login: async (_, { login, password }) => {
      if (!login || !password) throw new Error('Логин и пароль обязательны');

      const user = await User.findOne({
        $or: [{ username: login }, { email: login }],
      });

      if (!user) throw new Error('Пользователь не найден');

      const isPasswordValid = await argon2.verify(user.password, password);
      if (!isPasswordValid) throw new Error('Неверный пароль');

      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        SECRET_KEY,
      );

      return {
        token,
        user: { ...user.toObject(), id: user._id, favorites: user.favorites || [], watchStatus: user.watchStatus || [] },
      };
    },
    addFriend: async (_, { friendUsername }, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      const friend = await User.findOne({ username: friendUsername });
      if (!friend) throw new Error("Пользователь не найден");
      if (friend._id.toString() === user.id) {
        throw new Error("Нельзя добавить себя в друзья");
      }

      const existingRequest = await Friendship.findOne({
        userId: user.id,
        friendId: friend._id,
      });
      if (existingRequest) throw new Error("Запрос уже отправлен");

      const friendship = new Friendship({
        userId: user.id,
        friendId: friend._id,
      });
      await friendship.save();
      return "Запрос на дружбу отправлен";
    },
    acceptFriend: async (_, { friendshipId }, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      const friendship = await Friendship.findOne({ _id: friendshipId, friendId: user.id });
      if (!friendship) throw new Error("Запрос не найден");
      if (friendship.status !== "pending") throw new Error("Запрос уже обработан");

      friendship.status = "accepted";
      await friendship.save();
      return "Друг добавлен";
    },
    addToFavorites: async (_, { imdbID }, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      const foundUser = await User.findById(user.id);

      if (!foundUser.favorites.includes(imdbID)) {
        foundUser.favorites.push(imdbID);
        await foundUser.save();
      }

      return foundUser.favorites;
    },
    removeFromFavorites: async (_, { imdbID }, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      const foundUser = await User.findById(user.id);

      if (foundUser.favorites.includes(imdbID)) {
        foundUser.favorites = foundUser.favorites.filter(id => id !== imdbID);
        await foundUser.save();
      }

      return foundUser.favorites;
    },
    updateWatchStatus: async (_, { imdbID, status }, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      if (!imdbID || !status) throw new Error("imdbID и status обязательны");

      const validStatuses = ["plan_to_watch", "watching", "completed", "dropped"];
      if (!validStatuses.includes(status)) throw new Error("Недопустимый статус");

      const foundUser = await User.findById(user.id);
      const existingStatus = foundUser.watchStatus.find((ws) => ws.imdbID === imdbID);

      if (existingStatus) {
        existingStatus.status = status;
      } else {
        foundUser.watchStatus.push({ imdbID, status });
      }

      await foundUser.save();
      return foundUser.watchStatus;
    },
    updateAvatar: async (_, { avatarUrl }, { user }) => {
      if (!user) throw new Error('Требуется авторизация');
      if (!avatarUrl) throw new Error('URL аватара обязателен');

      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        { avatar: avatarUrl },
        { new: true }
      ).select('-password');

      return updatedUser;
    },
  },
};

// Настройка Apollo Server
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const user = jwt.verify(token, SECRET_KEY);
        return { user };
      } catch (err) {
        console.error('Invalid token in GraphQL context:', err);
      }
    }
    return { user: null };
  },
});

// Запуск Apollo Server
(async () => {
  await apolloServer.start();
  app.use('/graphql', expressMiddleware(apolloServer));
})();

module.exports = app;