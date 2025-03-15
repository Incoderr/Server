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
exports.UsersResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../auth/auth.guard");
const users_service_1 = require("../../users/users.service");
const anime_service_1 = require("../../anime/anime.service");
const auth_service_1 = require("../../auth/auth.service");
const friendship_service_1 = require("../../friendship/friendship.service");
const users_dto_1 = require("../../users/users.dto");
let UsersResolver = class UsersResolver {
    constructor(usersService, animeService, authService, friendshipService) {
        this.usersService = usersService;
        this.animeService = animeService;
        this.authService = authService;
        this.friendshipService = friendshipService;
    }
    async getProfile(req) {
        const user = await this.usersService.findById(req.user.id);
        const favoritesData = await Promise.all(user.favorites.map((imdbID) => this.animeService.findByImdbID(imdbID)));
        return Object.assign(Object.assign({}, user.toObject()), { favoritesData });
    }
    async getProfileByUsername(username, req) {
        const user = await this.usersService.findByUsername(username);
        if (!user)
            throw new Error('Пользователь не найден');
        const isCurrentUser = req.user.username === username;
        const areFriends = await this.friendshipService.areFriends(req.user.id, user._id.toString());
        if (!isCurrentUser && !areFriends) {
            throw new Error('Доступ запрещён: пользователь не является вашим другом');
        }
        const favoritesData = await Promise.all(user.favorites.map((imdbID) => this.animeService.findByImdbID(imdbID)));
        return Object.assign(Object.assign({}, user.toObject()), { favoritesData });
    }
    async searchUser(username, req) {
        const user = await this.usersService.findByUsername(username);
        if (!user)
            throw new Error('Пользователь не найден');
        if (user._id.toString() === req.user.id) {
            throw new Error('Нельзя добавить себя в друзья');
        }
        return { id: user._id.toString(), username: user.username, avatar: user.avatar };
    }
    async getWatchStats(req) {
        return this.usersService.getWatchStats(req.user.id);
    }
    async register(login, email, password, turnstileToken, role) {
        return this.authService.register({ login, email, password, turnstileToken, role });
    }
    async login(login, password) {
        return this.authService.login({ login, password });
    }
    async addToFavorites(imdbID, req) {
        return this.usersService.addToFavorites(req.user.id, imdbID);
    }
    async removeFromFavorites(imdbID, req) {
        return this.usersService.removeFromFavorites(req.user.id, imdbID);
    }
    async updateWatchStatus(imdbID, status, req) {
        return this.usersService.updateWatchStatus(req.user.id, imdbID, status);
    }
    async updateAvatar(avatarUrl, req) {
        return this.usersService.updateAvatar(req.user.id, avatarUrl);
    }
};
exports.UsersResolver = UsersResolver;
__decorate([
    (0, graphql_1.Query)(() => users_dto_1.UserDto, { name: 'profile' }),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "getProfile", null);
__decorate([
    (0, graphql_1.Query)(() => users_dto_1.UserDto, { name: 'profileByUsername' }),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('username', { type: () => String })),
    __param(1, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "getProfileByUsername", null);
__decorate([
    (0, graphql_1.Query)(() => users_dto_1.SearchUserDto, { name: 'searchUser' }),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('username', { type: () => String })),
    __param(1, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "searchUser", null);
__decorate([
    (0, graphql_1.Query)(() => users_dto_1.WatchStatsDto, { name: 'watchStats' }),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "getWatchStats", null);
__decorate([
    (0, graphql_1.Mutation)(() => users_dto_1.AuthResponseDto, { name: 'register' }),
    __param(0, (0, graphql_1.Args)('login', { type: () => String })),
    __param(1, (0, graphql_1.Args)('email', { type: () => String })),
    __param(2, (0, graphql_1.Args)('password', { type: () => String })),
    __param(3, (0, graphql_1.Args)('turnstileToken', { type: () => String })),
    __param(4, (0, graphql_1.Args)('role', { type: () => String, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "register", null);
__decorate([
    (0, graphql_1.Mutation)(() => users_dto_1.AuthResponseDto, { name: 'login' }),
    __param(0, (0, graphql_1.Args)('login', { type: () => String })),
    __param(1, (0, graphql_1.Args)('password', { type: () => String })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "login", null);
__decorate([
    (0, graphql_1.Mutation)(() => [String], { name: 'addToFavorites' }),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('imdbID', { type: () => String })),
    __param(1, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "addToFavorites", null);
__decorate([
    (0, graphql_1.Mutation)(() => [String], { name: 'removeFromFavorites' }),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('imdbID', { type: () => String })),
    __param(1, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "removeFromFavorites", null);
__decorate([
    (0, graphql_1.Mutation)(() => [users_dto_1.WatchStatusDto], { name: 'updateWatchStatus' }),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('imdbID', { type: () => String })),
    __param(1, (0, graphql_1.Args)('status', { type: () => String })),
    __param(2, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "updateWatchStatus", null);
__decorate([
    (0, graphql_1.Mutation)(() => users_dto_1.UserDto, { name: 'updateAvatar' }),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('avatarUrl', { type: () => String })),
    __param(1, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "updateAvatar", null);
exports.UsersResolver = UsersResolver = __decorate([
    (0, graphql_1.Resolver)(() => users_dto_1.UserDto),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        anime_service_1.AnimeService,
        auth_service_1.AuthService,
        friendship_service_1.FriendshipService])
], UsersResolver);
//# sourceMappingURL=users.resolver.js.map