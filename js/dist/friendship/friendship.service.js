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
exports.FriendshipService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const friendship_schema_1 = require("./friendship.schema");
const users_service_1 = require("../users/users.service");
let FriendshipService = class FriendshipService {
    constructor(friendshipModel, usersService) {
        this.friendshipModel = friendshipModel;
        this.usersService = usersService;
    }
    async requestFriendship(userId, friendUsername) {
        const friend = await this.usersService.findByUsername(friendUsername);
        if (!friend) {
            throw new common_1.NotFoundException('Пользователь не найден');
        }
        if (friend._id.toString() === userId) {
            throw new common_1.BadRequestException('Нельзя добавить себя в друзья');
        }
        const existingRequest = await this.friendshipModel.findOne({
            userId,
            friendId: friend._id,
        });
        if (existingRequest) {
            throw new common_1.BadRequestException('Запрос уже отправлен');
        }
        const friendship = new this.friendshipModel({
            userId,
            friendId: friend._id,
        });
        return friendship.save();
    }
    async acceptFriendship(userId, friendshipId) {
        const friendship = await this.friendshipModel.findOne({
            _id: friendshipId,
            friendId: userId,
        });
        if (!friendship) {
            throw new common_1.NotFoundException('Запрос не найден');
        }
        if (friendship.status !== 'pending') {
            throw new common_1.BadRequestException('Запрос уже обработан');
        }
        friendship.status = 'accepted';
        return friendship.save();
    }
    async getFriendsAndRequests(userId) {
        const friends = await this.friendshipModel
            .find({
            $or: [{ userId }, { friendId: userId }],
            status: 'accepted',
        })
            .populate('userId', 'username avatar')
            .populate('friendId', 'username avatar')
            .exec();
        const friendList = friends.map((f) => f.userId._id.toString() === userId ? f.friendId : f.userId);
        const pendingRequests = await this.friendshipModel
            .find({
            friendId: userId,
            status: 'pending',
        })
            .populate('userId', 'username avatar')
            .exec();
        return { friends: friendList, pendingRequests };
    }
    async areFriends(userId, friendId) {
        const friendship = await this.friendshipModel.findOne({
            $or: [
                { userId, friendId, status: 'accepted' },
                { userId: friendId, friendId: userId, status: 'accepted' },
            ],
        });
        return !!friendship;
    }
};
exports.FriendshipService = FriendshipService;
exports.FriendshipService = FriendshipService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(friendship_schema_1.Friendship.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService])
], FriendshipService);
//# sourceMappingURL=friendship.service.js.map