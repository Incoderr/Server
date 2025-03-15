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
exports.FriendshipController = void 0;
const common_1 = require("@nestjs/common");
const friendship_service_1 = require("./friendship.service");
const auth_guard_1 = require("../auth/auth.guard");
let FriendshipController = class FriendshipController {
    constructor(friendshipService) {
        this.friendshipService = friendshipService;
    }
    async requestFriendship(req, friendUsername) {
        await this.friendshipService.requestFriendship(req.user.id, friendUsername);
        return { message: 'Запрос на дружбу отправлен' };
    }
    async acceptFriendship(req, friendshipId) {
        await this.friendshipService.acceptFriendship(req.user.id, friendshipId);
        return { message: 'Друг добавлен' };
    }
    async getFriends(req) {
        return this.friendshipService.getFriendsAndRequests(req.user.id);
    }
};
exports.FriendshipController = FriendshipController;
__decorate([
    (0, common_1.Post)('friends/request'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('friendUsername')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FriendshipController.prototype, "requestFriendship", null);
__decorate([
    (0, common_1.Put)('friends/accept/:friendshipId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('friendshipId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FriendshipController.prototype, "acceptFriendship", null);
__decorate([
    (0, common_1.Get)('friends'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendshipController.prototype, "getFriends", null);
exports.FriendshipController = FriendshipController = __decorate([
    (0, common_1.Controller)('api'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [friendship_service_1.FriendshipService])
], FriendshipController);
//# sourceMappingURL=friendship.controller.js.map