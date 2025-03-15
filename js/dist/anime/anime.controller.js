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
exports.AnimeController = void 0;
const common_1 = require("@nestjs/common");
const anime_service_1 = require("./anime.service");
const auth_guard_1 = require("../auth/auth.guard");
let AnimeController = class AnimeController {
    constructor(animeService) {
        this.animeService = animeService;
    }
    async getAnimeList(query) {
        const genreMapping = {
            "Экшен": "Action",
            "Приключения": "Adventure",
        };
        const searchQuery = {};
        if (query.genre) {
            const genres = Array.isArray(query.genre) ? query.genre : query.genre.split(',');
            searchQuery.Genre = { $in: genres.map(g => genreMapping[g] || g) };
        }
        if (query.search) {
            searchQuery.$or = [
                { Title: { $regex: new RegExp(query.search, 'i') } },
                { TitleEng: { $regex: new RegExp(query.search, 'i') } },
            ];
        }
        return this.animeService.findAll(Object.assign(Object.assign({}, query), searchQuery));
    }
    async getAnime(imdbID) {
        return this.animeService.findByImdbID(imdbID);
    }
    async proxyAnilist(body) {
    }
    async getAdminAnimeList() {
        return this.animeService.findAll({});
    }
    async createAnime(animeData) {
        return this.animeService.create(animeData);
    }
    async updateAnime(imdbID, animeData) {
        return this.animeService.update(imdbID, animeData);
    }
    async deleteAnime(imdbID) {
        await this.animeService.delete(imdbID);
        return { message: 'Аниме удалено', imdbID };
    }
};
exports.AnimeController = AnimeController;
__decorate([
    (0, common_1.Get)('anime'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnimeController.prototype, "getAnimeList", null);
__decorate([
    (0, common_1.Get)('anime/:imdbID'),
    __param(0, (0, common_1.Param)('imdbID')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnimeController.prototype, "getAnime", null);
__decorate([
    (0, common_1.Post)('anilist'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnimeController.prototype, "proxyAnilist", null);
__decorate([
    (0, common_1.Get)('admin/anime'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.AdminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnimeController.prototype, "getAdminAnimeList", null);
__decorate([
    (0, common_1.Post)('admin/anime'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.AdminGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnimeController.prototype, "createAnime", null);
__decorate([
    (0, common_1.Put)('admin/anime/:imdbID'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('imdbID')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnimeController.prototype, "updateAnime", null);
__decorate([
    (0, common_1.Delete)('admin/anime/:imdbID'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, auth_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('imdbID')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnimeController.prototype, "deleteAnime", null);
exports.AnimeController = AnimeController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [anime_service_1.AnimeService])
], AnimeController);
//# sourceMappingURL=anime.controller.js.map