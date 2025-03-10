package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// Модели
type User struct {
	ID             primitive.ObjectID   `bson:"_id,omitempty" json:"id,omitempty"`
	Username       string               `bson:"username" json:"username"`
	Email          string               `bson:"email" json:"email"`
	Password       string               `bson:"password" json:"-"`
	Favorites      []string             `bson:"favorites" json:"favorites"`
	Avatar         string               `bson:"avatar" json:"avatar"`
	Role           string               `bson:"role" json:"role"`
	Friends        []primitive.ObjectID `bson:"friends" json:"friends"`
	FriendRequests []primitive.ObjectID `bson:"friendRequests" json:"friendRequests"`
}

type Anime struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Title      string             `bson:"Title" json:"Title"`
	TitleEng   string             `bson:"TitleEng" json:"TitleEng"`
	Poster     string             `bson:"Poster" json:"Poster"`
	Backdrop   string             `bson:"Backdrop" json:"Backdrop,omitempty"`
	Year       string             `bson:"Year" json:"Year"`
	Released   string             `bson:"Released" json:"Released"`
	ImdbRating string             `bson:"imdbRating" json:"imdbRating,omitempty"`
	ImdbID     string             `bson:"imdbID" json:"imdbID"`
	Episodes   int                `bson:"Episodes" json:"Episodes,omitempty"`
	Genre      []string           `bson:"Genre" json:"Genre"`
	Tags       []string           `bson:"Tags" json:"Tags,omitempty"`
	OverviewRu string             `bson:"OverviewRu" json:"OverviewRu"`
}

type Friendship struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	FriendID  primitive.ObjectID `bson:"friendId" json:"friendId"`
	Status    string             `bson:"status" json:"status"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type Claims struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.StandardClaims
}

// Глобальные переменные
var (
	client    *mongo.Client
	secretKey = os.Getenv("JWT_SECRET")
	mongoURI  = os.Getenv("MONGO_URI")
	router    *gin.Engine
)

// Инициализация (выполняется один раз при загрузке)
func init() {
	// Загрузка .env
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found")
	}

	// Подключение к MongoDB
	clientOptions := options.Client().ApplyURI(mongoURI)
	client, err = mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		log.Fatal("❌ MongoDB connection error:", err)
	}

	err = client.Ping(context.Background(), nil)
	if err != nil {
		log.Fatal("❌ MongoDB ping error:", err)
	}
	fmt.Println("✅ Connected to MongoDB")

	// Инициализация Gin
	router = gin.Default()

	// Настройка CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "https://animeinc.vercel.app"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Регистрация маршрутов
	router.POST("/api/register", registerHandler)
	router.POST("/api/login", loginHandler)
	router.GET("/api/profile", authenticateToken, profileHandler)
	router.POST("/api/favorites", authenticateToken, addFavoriteHandler)
	router.DELETE("/api/favorites", authenticateToken, removeFavoriteHandler)
	router.GET("/api/anime", getAnimeHandler)
	router.GET("/api/anime/:imdbID", getAnimeByIDHandler)
	router.POST("/api/anilist", anilistProxyHandler)

	// Admin роуты
	admin := router.Group("/api/admin").Use(authenticateToken, isAdmin)
	{
		admin.GET("/anime", getAllAnimeHandler)
		admin.POST("/anime", addAnimeHandler)
		admin.PUT("/anime/:imdbID", updateAnimeHandler)
		admin.DELETE("/anime/:imdbID", deleteAnimeHandler)
	}

	// Friends роуты
	router.POST("/api/friends/request", authenticateToken, friendRequestHandler)
	router.PUT("/api/friends/accept/:friendshipId", authenticateToken, acceptFriendRequestHandler)
	router.GET("/api/friends", authenticateToken, getFriendsHandler)
	router.GET("/api/users/search", authenticateToken, searchUsersHandler)
	router.PUT("/api/profile/avatar", authenticateToken, updateAvatarHandler)
}

// Экспортируемая функция для Vercel
func Handler(w http.ResponseWriter, r *http.Request) {
	router.ServeHTTP(w, r)
}

// Middleware
func authenticateToken(c *gin.Context) {
	tokenString := c.GetHeader("Authorization")
	if tokenString == "" || !strings.HasPrefix(tokenString, "Bearer ") {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Требуется авторизация"})
		c.Abort()
		return
	}

	tokenString = strings.TrimPrefix(tokenString, "Bearer ")
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(secretKey), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusForbidden, gin.H{"message": "Недействительный токен"})
		c.Abort()
		return
	}

	c.Set("user", claims)
	c.Next()
}

func isAdmin(c *gin.Context) {
	user := c.MustGet("user").(*Claims)
	if user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"message": "Доступ запрещён: требуется роль админа"})
		c.Abort()
		return
	}
	c.Next()
}

// Handlers
func registerHandler(c *gin.Context) {
	var input struct {
		Username       string `json:"login"`
		Email          string `json:"email"`
		Password       string `json:"password"`
		TurnstileToken string `json:"turnstileToken"`
		Role           string `json:"role"`
	}

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных"})
		return
	}

	if input.Username == "" || input.Email == "" || input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Все поля обязательны"})
		return
	}

	// Проверка Turnstile токена (упрощенно, без реализации)
	if input.TurnstileToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Требуется проверка капчи"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка хеширования пароля"})
		return
	}

	role := "user"
	if input.Role == "admin" {
		role = "admin"
	}

	user := User{
		Username:  input.Username,
		Email:     input.Email,
		Password:  string(hashedPassword),
		Role:      role,
		Avatar:    "https://i.ibb.co.com/Zyn02g6/avatar-default.webp",
		Favorites: []string{},
	}

	coll := client.Database("anime_db").Collection("users")
	result, err := coll.InsertOne(context.Background(), user)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"message": "Этот username или email уже зарегистрирован"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"message": "Ошибка регистрации", "error": err.Error()})
		return
	}

	id := result.InsertedID.(primitive.ObjectID)
	token, _ := generateJWT(id.Hex(), user.Username, user.Role)

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user": gin.H{
			"id":       id.Hex(),
			"username": user.Username,
			"avatar":   user.Avatar,
			"role":     user.Role,
		},
	})
}

func loginHandler(c *gin.Context) {
	var input struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных"})
		return
	}

	coll := client.Database("anime_db").Collection("users")
	var user User
	err := coll.FindOne(context.Background(), bson.M{
		"$or": []bson.M{
			{"username": input.Login},
			{"email": input.Login},
		},
	}).Decode(&user)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Пользователь не найден"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неверный пароль"})
		return
	}

	token, _ := generateJWT(user.ID.Hex(), user.Username, user.Role)
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":       user.ID.Hex(),
			"username": user.Username,
			"avatar":   user.Avatar,
			"role":     user.Role,
		},
	})
}

func profileHandler(c *gin.Context) {
	userClaims := c.MustGet("user").(*Claims)
	userID, _ := primitive.ObjectIDFromHex(userClaims.ID)

	coll := client.Database("anime_db").Collection("users")
	var user User
	err := coll.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сервера"})
		return
	}

	favColl := client.Database("anime_db").Collection("anime_list")
	var favoritesData []Anime
	for _, imdbID := range user.Favorites {
		var anime Anime
		err := favColl.FindOne(context.Background(), bson.M{"imdbID": imdbID}).Decode(&anime)
		if err == nil {
			favoritesData = append(favoritesData, anime)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":            user.ID.Hex(),
		"username":      user.Username,
		"email":         user.Email,
		"favorites":     user.Favorites,
		"favoritesData": favoritesData,
		"avatar":        user.Avatar,
		"role":          user.Role,
	})
}

func addFavoriteHandler(c *gin.Context) {
	userClaims := c.MustGet("user").(*Claims)
	userID, _ := primitive.ObjectIDFromHex(userClaims.ID)

	var input struct {
		ImdbID string `json:"imdbID"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных"})
		return
	}

	coll := client.Database("anime_db").Collection("users")
	update := bson.M{"$addToSet": bson.M{"favorites": input.ImdbID}}
	result, err := coll.UpdateOne(context.Background(), bson.M{"_id": userID}, update)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Ошибка при добавлении в избранное"})
		return
	}

	var updatedUser User
	coll.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&updatedUser)
	c.JSON(http.StatusOK, gin.H{"success": true, "favorites": updatedUser.Favorites})
}

func removeFavoriteHandler(c *gin.Context) {
	userClaims := c.MustGet("user").(*Claims)
	userID, _ := primitive.ObjectIDFromHex(userClaims.ID)

	var input struct {
		ImdbID string `json:"imdbID"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных"})
		return
	}

	coll := client.Database("anime_db").Collection("users")
	update := bson.M{"$pull": bson.M{"favorites": input.ImdbID}}
	_, err := coll.UpdateOne(context.Background(), bson.M{"_id": userID}, update)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Ошибка при удалении из избранного"})
		return
	}

	var updatedUser User
	coll.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&updatedUser)
	c.JSON(http.StatusOK, gin.H{"success": true, "favorites": updatedUser.Favorites})
}

func getAnimeHandler(c *gin.Context) {
	genre := c.Query("genre")
	search := c.Query("search")
	limitStr := c.Query("limit")

	filter := bson.M{}
	if genre != "" {
		genres := strings.Split(genre, ",")
		for i, g := range genres {
			genres[i] = strings.TrimSpace(g)
		}
		filter["Genre"] = bson.M{"$in": genres}
	}
	if search != "" {
		filter["$or"] = []bson.M{
			{"Title": bson.M{"$regex": search, "$options": "i"}},
			{"TitleEng": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	opts := options.Find()
	if limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			opts.SetLimit(int64(limit))
		}
	}

	coll := client.Database("anime_db").Collection("anime_list")
	cursor, err := coll.Find(context.Background(), filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при получении аниме"})
		return
	}
	defer cursor.Close(context.Background())

	var animeList []Anime
	if err := cursor.All(context.Background(), &animeList); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при декодировании аниме"})
		return
	}

	if len(animeList) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Аниме не найдено"})
		return
	}

	c.JSON(http.StatusOK, animeList)
}

func getAnimeByIDHandler(c *gin.Context) {
	imdbID := c.Param("imdbID")
	coll := client.Database("anime_db").Collection("anime_list")
	var anime Anime
	err := coll.FindOne(context.Background(), bson.M{"imdbID": imdbID}).Decode(&anime)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Аниме не найдено"})
		return
	}
	c.JSON(http.StatusOK, anime)
}

func anilistProxyHandler(c *gin.Context) {
	var input struct {
		Query     string                 `json:"query"`
		Variables map[string]interface{} `json:"variables"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных"})
		return
	}

	resp, err := http.Post("https://graphql.anilist.co", "application/json", strings.NewReader(fmt.Sprintf(`{"query": %q, "variables": %v}`, input.Query, input.Variables)))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при запросе к AniList"})
		return
	}
	defer resp.Body.Close()

	var result interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	c.JSON(http.StatusOK, result)
}

func getAllAnimeHandler(c *gin.Context) {
	coll := client.Database("anime_db").Collection("anime_list")
	cursor, err := coll.Find(context.Background(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при получении списка аниме"})
		return
	}
	defer cursor.Close(context.Background())

	var animeList []Anime
	if err := cursor.All(context.Background(), &animeList); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при декодировании аниме"})
		return
	}
	c.JSON(http.StatusOK, animeList)
}

func addAnimeHandler(c *gin.Context) {
	var anime Anime
	if err := c.BindJSON(&anime); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных"})
		return
	}

	coll := client.Database("anime_db").Collection("anime_list")
	result, err := coll.InsertOne(context.Background(), anime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Ошибка при добавлении аниме"})
		return
	}

	anime.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, anime)
}

func updateAnimeHandler(c *gin.Context) {
	imdbID := c.Param("imdbID")
	var anime Anime
	if err := c.BindJSON(&anime); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных"})
		return
	}

	coll := client.Database("anime_db").Collection("anime_list")
	update := bson.M{"$set": anime}
	result, err := coll.UpdateOne(context.Background(), bson.M{"imdbID": imdbID}, update)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Аниме не найдено"})
		return
	}

	c.JSON(http.StatusOK, anime)
}

func deleteAnimeHandler(c *gin.Context) {
	imdbID := c.Param("imdbID")
	coll := client.Database("anime_db").Collection("anime_list")
	result, err := coll.DeleteOne(context.Background(), bson.M{"imdbID": imdbID})
	if err != nil || result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Аниме не найдено"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Аниме удалено", "imdbID": imdbID})
}

func friendRequestHandler(c *gin.Context) {
	userClaims := c.MustGet("user").(*Claims)
	userID, _ := primitive.ObjectIDFromHex(userClaims.ID)

	var input struct {
		FriendID string `json:"friendId"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных"})
		return
	}

	friendID, _ := primitive.ObjectIDFromHex(input.FriendID)
	coll := client.Database("anime_db").Collection("friendships")
	friendship := Friendship{
		UserID:    userID,
		FriendID:  friendID,
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	_, err := coll.InsertOne(context.Background(), friendship)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сервера"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Запрос на дружбу отправлен"})
}

func acceptFriendRequestHandler(c *gin.Context) {
	userClaims := c.MustGet("user").(*Claims)
	userID, _ := primitive.ObjectIDFromHex(userClaims.ID)
	friendshipID, _ := primitive.ObjectIDFromHex(c.Param("friendshipId"))

	coll := client.Database("anime_db").Collection("friendships")
	update := bson.M{"$set": bson.M{"status": "accepted"}}
	result, err := coll.UpdateOne(context.Background(), bson.M{"_id": friendshipID, "friendId": userID}, update)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Запрос не найден"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Друг добавлен"})
}

func getFriendsHandler(c *gin.Context) {
	userClaims := c.MustGet("user").(*Claims)
	userID, _ := primitive.ObjectIDFromHex(userClaims.ID)

	coll := client.Database("anime_db").Collection("friendships")
	cursor, err := coll.Find(context.Background(), bson.M{
		"$or": []bson.M{
			{"userId": userID},
			{"friendId": userID},
		},
		"status": "accepted",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сервера"})
		return
	}
	defer cursor.Close(context.Background())

	var friends []User
	for cursor.Next(context.Background()) {
		var f Friendship
		cursor.Decode(&f)
		friendID := f.FriendID
		if f.UserID == userID {
			friendID = f.FriendID
		} else {
			friendID = f.UserID
		}
		var friend User
		client.Database("anime_db").Collection("users").FindOne(context.Background(), bson.M{"_id": friendID}).Decode(&friend)
		friends = append(friends, friend)
	}

	pendingCursor, err := coll.Find(context.Background(), bson.M{"friendId": userID, "status": "pending"})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сервера"})
		return
	}
	defer pendingCursor.Close(context.Background())

	var pendingRequests []User
	for pendingCursor.Next(context.Background()) {
		var f Friendship
		pendingCursor.Decode(&f)
		var requester User
		client.Database("anime_db").Collection("users").FindOne(context.Background(), bson.M{"_id": f.UserID}).Decode(&requester)
		pendingRequests = append(pendingRequests, requester)
	}

	c.JSON(http.StatusOK, gin.H{"friends": friends, "pendingRequests": pendingRequests})
}

func searchUsersHandler(c *gin.Context) {
	username := c.Query("username")
	userClaims := c.MustGet("user").(*Claims)

	coll := client.Database("anime_db").Collection("users")
	var user User
	err := coll.FindOne(context.Background(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	}

	if user.ID.Hex() == userClaims.ID {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Нельзя добавить себя в друзья"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": user.ID.Hex(), "username": user.Username, "avatar": user.Avatar})
}

func updateAvatarHandler(c *gin.Context) {
	userClaims := c.MustGet("user").(*Claims)
	userID, _ := primitive.ObjectIDFromHex(userClaims.ID)

	var input struct {
		AvatarUrl string `json:"avatarUrl"`
	}
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных"})
		return
	}

	if input.AvatarUrl == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "URL аватара обязателен"})
		return
	}

	coll := client.Database("anime_db").Collection("users")
	update := bson.M{"$set": bson.M{"avatar": input.AvatarUrl}}
	_, err := coll.UpdateOne(context.Background(), bson.M{"_id": userID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при обновлении аватара"})
		return
	}

	var updatedUser User
	coll.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&updatedUser)
	c.JSON(http.StatusOK, updatedUser)
}

// Вспомогательные функции
func generateJWT(id, username, role string) (string, error) {
	claims := Claims{
		ID:       id,
		Username: username,
		Role:     role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(time.Hour).Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secretKey))
}
