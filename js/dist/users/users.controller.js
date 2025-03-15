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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const auth_guard_1 = require("../auth/auth.guard");
const anime_service_1 = require("../anime/anime.service");
let UsersController = class UsersController {
    constructor(usersService, animeService) {
        this.usersService = usersService;
        this.animeService = animeService;
    }
    async getProfile(req) {
        const user = await this.usersService.findById(req.user.id);
        const favoritesData = await Promise.all(user.favorites.map(imdbID => this.animeService.findByImdbID(imdbID)));
        return Object.assign(Object.assign({}, user.toObject()), { favoritesData });
    }
    async getProfileByUsername(username, req) {
    }
    async searchUser(username, req) {
        const user = await this.usersService.findByUsername(username);
        if (!user)
            throw new Error('Пользователь не найден');
        if (user._id.toString() === req.user.id) {
            throw new Error('Нельзя добавить себя в друзья');
        }
        return { username: user.username, avatar: user.avatar, _id: user._id };
    }
    async updateAvatar(req, avatarUrl) {
        return this.usersService.updateAvatar(req.user.id, avatarUrl);
    }
    async addToFavorites(req, imdbID) {
        const favorites = await this.usersService.addToFavorites(req.user.id, imdbID);
        return { success: true, favorites };
    }
    async removeFromFavorites(req, imdbID) {
        const favorites = await this.usersService.removeFromFavorites(req.user.id, imdbID);
        return { success: true, favorites };
    }
    async updateWatchStatus(req, body) {
        const watchStatus = await this.usersService.updateWatchStatus(req.user.id, body.imdbID, body.status);
        return { success: true, watchStatus };
    }
    async getWatchStats(req) {
        return this.usersService.getWatchStats(req.user.id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('profile/:username'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfileByUsername", null);
__decorate([
    (0, common_1.Get)('profile/search'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('username')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "searchUser", null);
__decorate([
    (0, common_1.Put)('profile/avatar'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('avatarUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateAvatar", null);
__decorate([
    (0, common_1.Post)('favorites'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('imdbID')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "addToFavorites", null);
__decorate([
    (0, common_1.Delete)('favorites'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('imdbID')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removeFromFavorites", null);
__decorate([
    (0, common_1.Put)('watch-status'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateWatchStatus", null);
__decorate([
    (0, common_1.Get)('watch-status/stats'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getWatchStats", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        anime_service_1.AnimeService])
], UsersController);
//# sourceMappingURL=users.controller.js.map