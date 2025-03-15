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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchStatusDto = exports.AuthResponseDto = exports.WatchStatsDto = exports.SearchUserDto = exports.UserDto = void 0;
const graphql_1 = require("@nestjs/graphql");
const anime_dto_1 = require("../anime/anime.dto");
let UserDto = class UserDto {
};
exports.UserDto = UserDto;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], UserDto.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], UserDto.prototype, "username", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], UserDto.prototype, "email", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    __metadata("design:type", String)
], UserDto.prototype, "avatar", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], UserDto.prototype, "role", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String]),
    __metadata("design:type", Array)
], UserDto.prototype, "favorites", void 0);
__decorate([
    (0, graphql_1.Field)(() => [anime_dto_1.AnimeDto], { nullable: true }),
    __metadata("design:type", Array)
], UserDto.prototype, "favoritesData", void 0);
exports.UserDto = UserDto = __decorate([
    (0, graphql_1.ObjectType)()
], UserDto);
let SearchUserDto = class SearchUserDto {
};
exports.SearchUserDto = SearchUserDto;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], SearchUserDto.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], SearchUserDto.prototype, "username", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    __metadata("design:type", String)
], SearchUserDto.prototype, "avatar", void 0);
exports.SearchUserDto = SearchUserDto = __decorate([
    (0, graphql_1.ObjectType)()
], SearchUserDto);
let WatchStatsDto = class WatchStatsDto {
};
exports.WatchStatsDto = WatchStatsDto;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], WatchStatsDto.prototype, "plan_to_watch", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], WatchStatsDto.prototype, "watching", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], WatchStatsDto.prototype, "completed", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], WatchStatsDto.prototype, "dropped", void 0);
exports.WatchStatsDto = WatchStatsDto = __decorate([
    (0, graphql_1.ObjectType)()
], WatchStatsDto);
let AuthResponseDto = class AuthResponseDto {
};
exports.AuthResponseDto = AuthResponseDto;
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "token", void 0);
__decorate([
    (0, graphql_1.Field)(() => UserDto),
    __metadata("design:type", UserDto)
], AuthResponseDto.prototype, "user", void 0);
exports.AuthResponseDto = AuthResponseDto = __decorate([
    (0, graphql_1.ObjectType)()
], AuthResponseDto);
let WatchStatusDto = class WatchStatusDto {
};
exports.WatchStatusDto = WatchStatusDto;
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], WatchStatusDto.prototype, "imdbID", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], WatchStatusDto.prototype, "status", void 0);
exports.WatchStatusDto = WatchStatusDto = __decorate([
    (0, graphql_1.ObjectType)()
], WatchStatusDto);
//# sourceMappingURL=users.dto.js.map