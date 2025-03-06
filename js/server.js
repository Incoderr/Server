require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const axios = require('axios');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://animeinc.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
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
  avatar: { type: String, default: 'https://ibb.co.com/qMX1hGDz' },
  role: { type: String, default: 'user', enum: ['user', 'admin'] }, // Роль: user или admin
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещён: требуется роль админа' });
  }
  next();
};

// Схема аниме (оставляем как есть)
const animeSchema = new mongoose.Schema({
  Title: { type: String, required: true }, // Русское название
  TitleEng: { type: String, required: true }, // Оригинальное название
  Poster: { type: String, required: true }, // URL постера
  Backdrop: { type: String }, // URL бэкдропа (необязательное поле)
  Year: { type: String, required: true }, // Год выпуска
  Released: { type: String, required: true }, // Дата релиза
  imdbRating: { type: String }, // Рейтинг IMDb
  imdbID: { type: String, required: true, unique: true }, // Уникальный идентификатор IMDb
  Episodes: { type: Number }, // Количество серий (числовой тип)
  Genre: { type: [String], required: true, default: [] }, // Жанры (массив строк)
  Tags: { type: [String], default: [] }, // Теги (массив строк, по умолчанию пустой)
  OverviewRu: { type: String, required: true }, // Описание на русском
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


// Функция проверки токена Turnstile
const verifyTurnstileToken = async (token) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || 'YOUR_TURNSTILE_SECRET_KEY'; // Используйте переменную окружения
  try {
    const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      secret: secretKey,
      response: token,
    });
    return response.data.success; // true, если токен валиден
  } catch (error) {
    console.error('Ошибка проверки Turnstile:', error.message);
    return false;
  }
};

// Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { login: username, email, password, turnstileToken, role = 'user' } = req.body;

    // Логируем полученные данные
    console.log('Register request body:', { username, email, password, turnstileToken, role });

    // Проверка токена Turnstile
    if (!turnstileToken) {
      return res.status(400).json({ message: 'Требуется проверка капчи' });
    }
    const isValidCaptcha = await verifyTurnstileToken(turnstileToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ message: 'Ошибка проверки капчи' });
    }

    // Валидация роли
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Недопустимая роль. Доступные роли: user, admin' });
    }

    // Проверка наличия обязательных полей
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Все поля (username, email, password) обязательны' });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание нового пользователя
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role,
    });

    // Сохранение пользователя
    await user.save();

    // Генерация JWT токена
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Ответ клиенту
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
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

// Вход
app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body; // Убрали turnstileToken

    if (!login || !password) {
      return res.status(400).json({ message: 'Логин и пароль обязательны' });
    }

    // Поиск пользователя
    const user = await User.findOne({
      $or: [{ username: login }, { email: login }],
    });

    // Проверка существования пользователя и пароля
    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверный пароль' });
    }

    // Генерация JWT токена
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
    );

    // Ответ клиенту
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Ошибка входа:', error.message);
    res.status(400).json({ message: 'Ошибка входа', error: error.message });
  }
});

// Профиль
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

    // Обработка жанров
    if (genre) {
      // Если genre — строка, разбиваем её по запятым и обрезаем пробелы
      const genreArray = Array.isArray(genre) 
        ? genre.map(g => g.trim()) 
        : genre.toString().split(',').map(g => g.trim()).filter(Boolean);
      
      // Преобразуем русские жанры в английские (если используются русские в запросе)
      const genreMapping = {
        "Анимация": "Animation",
        "Комедия": "Comedy",
        "Романтика": "Romance",
        "Драма": "Drama",
        "Экшен": "Action",
        // Добавьте другие маппинги по необходимости
      };

      const englishGenres = genreArray.map(g => genreMapping[g] || g); // Преобразуем в английские, если есть маппинг
      query.Genre = { $in: englishGenres }; // Ищем аниме, у которых в массиве Genre есть хотя бы один из указанных жанров
    }

    // Обработка поиска
    if (search) {
      query.$or = [
        { Title: { $regex: new RegExp(search, 'i') } },
        { TitleEng: { $regex: new RegExp(search, 'i') } }
      ];
    }

    let dbQuery = Anime.find(query);
    if (fields) dbQuery = dbQuery.select(fields.split(',').join(' '));
    if (limit) dbQuery = dbQuery.limit(parseInt(limit) || 10); // По умолчанию лимит 10
    if (sort) dbQuery = dbQuery.sort(sort);

    const animeList = await dbQuery;
    const uniqueAnime = Array.from(
      new Map(
        animeList
          .filter(item => item.imdbID) // Фильтруем записи без imdbID
          .map(item => [item.imdbID, item])
      ).values()
    ).map(anime => ({
      ...anime.toObject(),
      Genre: Array.isArray(anime.Genre) ? anime.Genre : (anime.Genre ? [anime.Genre] : []), // Гарантируем, что Genre — массив
    }));

    if (uniqueAnime.length === 0) return res.status(404).json({ message: 'Аниме не найдено' });
    res.json(uniqueAnime);
  } catch (error) {
    console.error('Ошибка при получении аниме:', error);
    res.status(500).json({ message: 'Ошибка при получении аниме', error });
  }
});

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

    // Функция нормализации названий
    const normalizeTitle = (title) => {
      if (!title) return '';
      return title
        .toLowerCase()
        .replace(/season \d+/g, '') // Удаляем "Season X"
        .replace(/part \d+/g, '')   // Удаляем "Part X"
        .replace(/\s+/g, ' ')       // Убираем лишние пробелы
        .replace(/[^\w\s]/g, '')    // Убираем знаки препинания
        .trim();
    };

    // Собираем нормализованные названия из AniList
    const titlesToSearch = anilistMedia.map(anime => ({
      romaji: normalizeTitle(anime.title.romaji),
      english: normalizeTitle(anime.title.english),
    }));

    // Ищем совпадения в MongoDB
    const dbAnimeList = await Anime.find({}).select('Title TitleEng imdbID Backdrop Poster OverviewRu Episodes Year imdbRating Genre Status');
    
    // Карта для быстрого поиска совпадений
    const dbAnimeMap = new Map();
    dbAnimeList.forEach(dbAnime => {
      if (dbAnime.Title) dbAnimeMap.set(normalizeTitle(dbAnime.Title), dbAnime);
      if (dbAnime.TitleEng) dbAnimeMap.set(normalizeTitle(dbAnime.TitleEng), dbAnime);
    });

    // Обогащаем данные AniList
    const enhancedMedia = anilistMedia.map(anime => {
      const normalizedRomaji = normalizeTitle(anime.title.romaji);
      const normalizedEnglish = normalizeTitle(anime.title.english);

      // Ищем совпадение по нормализованным названиям
      const dbAnime = dbAnimeMap.get(normalizedRomaji) || dbAnimeMap.get(normalizedEnglish);

      // Если точного совпадения нет, ищем частичное совпадение
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
// admin
// Получение всех аниме
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

// Добавление нового аниме
app.post('/api/admin/anime', authenticateToken, isAdmin, async (req, res) => {
  try {
    const animeData = req.body;
    if (!animeData.imdbID || !animeData.Title || !animeData.TitleEng || !animeData.Poster || !animeData.Year || !animeData.Released || !animeData.Genre || !animeData.OverviewRu) {
      return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
    }
    // Преобразуем Genre в массив, если строка (например, "Animation, Comedy, Romance" → ["Animation", "Comedy", "Romance"])
    if (typeof animeData.Genre === 'string') {
      animeData.Genre = animeData.Genre.split(",").map(genre => genre.trim()).filter(Boolean);
    }
    // Преобразуем Episodes в число, если оно есть
    if (animeData.Episodes) {
      animeData.Episodes = parseInt(animeData.Episodes) || 0;
    }
    // Преобразуем Tags в массив, если строка
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

// Редактирование аниме
app.put('/api/admin/anime/:imdbID', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { imdbID } = req.params;
    const updatedData = req.body;

    // Логирование данных запроса для отладки
    console.log('PUT /api/admin/anime/:imdbID - Received data:', updatedData);

    // Проверка обязательных полей
    if (!updatedData.Title || !updatedData.TitleEng || !updatedData.Poster || !updatedData.Year || !updatedData.Released || !updatedData.OverviewRu) {
      return res.status(400).json({ message: 'Обязательные поля (Title, TitleEng, Poster, Year, Released, OverviewRu) должны быть заполнены' });
    }

    // Преобразуем Genre в массив, если строка
    if (typeof updatedData.Genre === 'string') {
      updatedData.Genre = updatedData.Genre.split(",").map(genre => genre.trim()).filter(Boolean);
    }
    // Проверяем, что Genre не пустой массив
    if (!updatedData.Genre || updatedData.Genre.length === 0) {
      return res.status(400).json({ message: 'Жанры (Genre) должны быть указаны' });
    }

    // Преобразуем Tags в массив, если строка
    if (typeof updatedData.Tags === 'string') {
      updatedData.Tags = updatedData.Tags.split(",").map(tag => tag.trim()).filter(Boolean);
    }

    // Преобразуем Episodes в число, если оно есть
    if (updatedData.Episodes !== undefined && updatedData.Episodes !== null) {
      updatedData.Episodes = parseInt(updatedData.Episodes) || 0;
    }

    // Обрабатываем необязательные поля (Backdrop, imdbRating)
    if (updatedData.Backdrop === "") {
      updatedData.Backdrop = undefined; // Устанавливаем undefined для необязательного поля
    }
    if (updatedData.imdbRating === "") {
      updatedData.imdbRating = undefined; // Устанавливаем undefined для необязательного поля
    }

    // Удаляем поле _id, если оно случайно передано из клиента
    delete updatedData._id;

    // Ограничиваем обновляемые поля только теми, что определены в схеме
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
      allowedUpdates, // Используем только разрешенные поля
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

// Удаление аниме
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
module.exports = app;