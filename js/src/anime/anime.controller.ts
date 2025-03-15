import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { JwtAuthGuard, AdminGuard } from '../auth/auth.guard';

@Controller('api')
export class AnimeController {
  constructor(private animeService: AnimeService) {}

  @Get('anime')
  async getAnimeList(@Query() query) {
    const genreMapping = {
      "Экшен": "Action",
      "Приключения": "Adventure",
      // ... остальные маппинги жанров
    };
    
    const searchQuery: any = {};
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

    return this.animeService.findAll({ ...query, ...searchQuery });
  }

  @Get('anime/:imdbID')
  async getAnime(@Param('imdbID') imdbID: string) {
    return this.animeService.findByImdbID(imdbID);
  }

  @Post('anilist')
  async proxyAnilist(@Body() body: { query: string; variables: any }) {
    // Реализация прокси для AniList API осталась аналогичной
  }

  @Get('admin/anime')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAdminAnimeList() {
    return this.animeService.findAll({});
  }

  @Post('admin/anime')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createAnime(@Body() animeData: any) {
    return this.animeService.create(animeData);
  }

  @Put('admin/anime/:imdbID')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateAnime(@Param('imdbID') imdbID: string, @Body() animeData: any) {
    return this.animeService.update(imdbID, animeData);
  }

  @Delete('admin/anime/:imdbID')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteAnime(@Param('imdbID') imdbID: string) {
    await this.animeService.delete(imdbID);
    return { message: 'Аниме удалено', imdbID };
  }
}