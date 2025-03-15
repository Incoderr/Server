"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimeResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const anime_service_1 = require("../../anime/anime.service");
const anime_dto_1 = require("../../anime/anime.dto");
const graphql_2 = require("graphql");
let AnimeResolver = class AnimeResolver {
    constructor(animeService) {
        this.animeService = animeService;
    }
    async getAnime(imdbID) {
        const anime = await this.animeService.findByImdbID(imdbID);
        if (!anime) {
            throw new Error('Аниме не найдено');
        }
        return Object.assign(Object.assign({}, anime.toObject()), { Genre: Array.isArray(anime.Genre) ? anime.Genre : (anime.Genre ? [anime.Genre] : []), Tags: Array.isArray(anime.Tags) ? anime.Tags : (anime.Tags ? [anime.Tags] : []) });
    }
    async getAnimeList(genre, search, fields, limit, sort) {
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
        const query = {};
        if (genre && genre.length > 0) {
            query.Genre = { $in: genre.map(g => genreMapping[g] || g) };
        }
        if (search) {
            query.$or = [
                { Title: { $regex: new RegExp(search, 'i') } },
                { TitleEng: { $regex: new RegExp(search, 'i') } },
            ];
        }
        const animeList = await this.animeService.findAll(Object.assign(Object.assign({}, query), { fields: fields === null || fields === void 0 ? void 0 : fields.join(' '), limit,
            sort }));
        if (animeList.length === 0) {
            throw new Error('Аниме не найдено');
        }
        return animeList;
    }
};
exports.AnimeResolver = AnimeResolver;
__decorate([
    (0, graphql_1.Query)(() => anime_dto_1.AnimeDto, { name: 'anime' }),
    __param(0, (0, graphql_1.Args)('imdbID', { type: () => String })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnimeResolver.prototype, "getAnime", null);
__decorate([
    (0, graphql_1.Query)(() => [anime_dto_1.AnimeDto], { name: 'animeList' }),
    __param(0, (0, graphql_1.Args)('genre', { type: () => [String], nullable: true })),
    __param(1, (0, graphql_1.Args)('search', { type: () => String, nullable: true })),
    __param(2, (0, graphql_1.Args)('fields', { type: () => [String], nullable: true })),
    __param(3, (0, graphql_1.Args)('limit', { type: () => graphql_2.GraphQLInt, nullable: true })),
    __param(4, (0, graphql_1.Args)('sort', { type: () => String, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String, Array, Number, String]),
    __metadata("design:returntype", Promise)
], AnimeResolver.prototype, "getAnimeList", null);
exports.AnimeResolver = AnimeResolver = __decorate([
    (0, graphql_1.Resolver)(() => anime_dto_1.AnimeDto),
    __metadata("design:paramtypes", [anime_service_1.AnimeService])
], AnimeResolver);
//# sourceMappingURL=anime.resolver.js.map