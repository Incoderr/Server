import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard, AdminGuard } from '../auth/auth.guard';
import { AnimeService } from '../anime/anime.service';

@Controller('api')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private animeService: AnimeService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    const favoritesData = await Promise.all(
      user.favorites.map(imdbID => this.animeService.findByImdbID(imdbID)),
    );
    return { ...user.toObject(), favoritesData };
  }

  @Get('profile/:username')
  @UseGuards(JwtAuthGuard)
  async getProfileByUsername(@Param('username') username: string, @Request() req) {
    // Реализация аналогична оригинальной с проверкой дружбы
    // Добавьте логику дружбы из FriendshipService
  }

  @Get('profile/search')
  @UseGuards(JwtAuthGuard)
  async searchUser(@Query('username') username: string, @Request() req) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new Error('Пользователь не найден');
    if (user._id.toString() === req.user.id) {
      throw new Error('Нельзя добавить себя в друзья');
    }
    return { username: user.username, avatar: user.avatar, _id: user._id };
  }

  @Put('profile/avatar')
  @UseGuards(JwtAuthGuard)
  async updateAvatar(@Request() req, @Body('avatarUrl') avatarUrl: string) {
    return this.usersService.updateAvatar(req.user.id, avatarUrl);
  }

  @Post('favorites')
  @UseGuards(JwtAuthGuard)
  async addToFavorites(@Request() req, @Body('imdbID') imdbID: string) {
    const favorites = await this.usersService.addToFavorites(req.user.id, imdbID);
    return { success: true, favorites };
  }

  @Delete('favorites')
  @UseGuards(JwtAuthGuard)
  async removeFromFavorites(@Request() req, @Body('imdbID') imdbID: string) {
    const favorites = await this.usersService.removeFromFavorites(req.user.id, imdbID);
    return { success: true, favorites };
  }

  @Put('watch-status')
  @UseGuards(JwtAuthGuard)
  async updateWatchStatus(@Request() req, @Body() body: { imdbID: string; status: string }) {
    const watchStatus = await this.usersService.updateWatchStatus(req.user.id, body.imdbID, body.status);
    return { success: true, watchStatus };
  }

  @Get('watch-status/stats')
  @UseGuards(JwtAuthGuard)
  async getWatchStats(@Request() req) {
    return this.usersService.getWatchStats(req.user.id);
  }
}