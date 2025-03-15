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
exports.AnimeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const anime_schema_1 = require("./anime.schema");
let AnimeService = class AnimeService {
    constructor(animeModel) {
        this.animeModel = animeModel;
    }
    async findAll(query) {
        let dbQuery = this.animeModel.find(query);
        if (query.fields)
            dbQuery = dbQuery.select(query.fields.split(',').join(' '));
        if (query.limit)
            dbQuery = dbQuery.limit(parseInt(query.limit));
        if (query.sort)
            dbQuery = dbQuery.sort(query.sort);
        const animeList = await dbQuery.exec();
        return animeList.map(anime => (Object.assign(Object.assign({}, anime.toObject()), { Genre: Array.isArray(anime.Genre) ? anime.Genre : (anime.Genre ? [anime.Genre] : []) })));
    }
    async findByImdbID(imdbID) {
        return this.animeModel.findOne({ imdbID }).exec();
    }
    async create(animeData) {
        const anime = new this.animeModel(animeData);
        return anime.save();
    }
    async update(imdbID, animeData) {
        return this.animeModel.findOneAndUpdate({ imdbID }, animeData, { new: true, runValidators: true }).exec();
    }
    async delete(imdbID) {
        return this.animeModel.findOneAndDelete({ imdbID }).exec();
    }
};
exports.AnimeService = AnimeService;
exports.AnimeService = AnimeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(anime_schema_1.Anime.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], AnimeService);
//# sourceMappingURL=anime.service.js.map