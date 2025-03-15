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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const users_schema_1 = require("./users.schema");
let UsersService = class UsersService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async findById(id) {
        const user = await this.userModel.findById(id).exec();
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        return user;
    }
    async findByUsername(username) {
        return this.userModel.findOne({ username }).exec();
    }
    async findByLogin(login) {
        return this.userModel.findOne({ $or: [{ username: login }, { email: login }] }).exec();
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email }).exec();
    }
    async create(userData) {
        const user = new this.userModel(userData);
        return user.save();
    }
    async updateAvatar(userId, avatarUrl) {
        const user = await this.userModel.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true }).exec();
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        return {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            favorites: user.favorites,
        };
    }
    async addToFavorites(userId, imdbID) {
        const user = await this.userModel.findByIdAndUpdate(userId, { $addToSet: { favorites: imdbID } }, { new: true }).exec();
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        return user.favorites;
    }
    async removeFromFavorites(userId, imdbID) {
        const user = await this.userModel.findByIdAndUpdate(userId, { $pull: { favorites: imdbID } }, { new: true }).exec();
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        return user.favorites;
    }
    async updateWatchStatus(userId, imdbID, status) {
        const user = await this.userModel.findById(userId).exec();
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        return [{ imdbID, status }];
    }
    async getWatchStats(userId) {
        const user = await this.userModel.findById(userId).exec();
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        return { plan_to_watch: 0, watching: 0, completed: 0, dropped: 0 };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(users_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map