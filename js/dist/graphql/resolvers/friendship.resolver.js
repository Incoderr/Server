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
exports.FriendshipResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../auth/auth.guard");
const friendship_service_1 = require("../../friendship/friendship.service");
const friendship_dto_1 = require("../../friendship/friendship.dto");
let FriendshipResolver = class FriendshipResolver {
    constructor(friendshipService) {
        this.friendshipService = friendshipService;
    }
    async getFriends(req) {
        const userId = req.user.id;
        const friends = await this.friendshipService.getFriends(userId);
        return friends.map(friend => ({
            id: friend._id.toString(),
            username: friend.username,
            avatar: friend.avatar,
            status: friend.status || 'offline',
        }));
    }
    async addFriend(friendUsername, req) {
        await this.friendshipService.requestFriendship(req.user.id, friendUsername);
        return 'Запрос на дружбу отправлен';
    }
    async acceptFriend(friendshipId, req) {
        await this.friendshipService.acceptFriendship(req.user.id, friendshipId);
        return 'Друг добавлен';
    }
};
exports.FriendshipResolver = FriendshipResolver;
__decorate([
    (0, graphql_1.Query)(() => [friendship_dto_1.FriendDto], { name: 'getFriends' }),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendshipResolver.prototype, "getFriends", null);
__decorate([
    Mutation('addFriend'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, Args('friendUsername')),
    __param(1, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FriendshipResolver.prototype, "addFriend", null);
__decorate([
    Mutation('acceptFriend'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, Args('friendshipId')),
    __param(1, (0, graphql_1.Context)('req')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FriendshipResolver.prototype, "acceptFriend", null);
exports.FriendshipResolver = FriendshipResolver = __decorate([
    (0, graphql_1.Resolver)(() => friendship_dto_1.FriendDto),
    __metadata("design:paramtypes", [friendship_service_1.FriendshipService])
], FriendshipResolver);
//# sourceMappingURL=friendship.resolver.js.map