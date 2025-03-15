import { Controller, Post, Put, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class FriendshipController {
  constructor(private friendshipService: FriendshipService) {}

  @Post('friends/request')
  async requestFriendship(
    @Request() req,
    @Body('friendUsername') friendUsername: string,
  ) {
    await this.friendshipService.requestFriendship(req.user.id, friendUsername);
    return { message: 'Запрос на дружбу отправлен' };
  }

  @Put('friends/accept/:friendshipId')
  async acceptFriendship(@Request() req, @Param('friendshipId') friendshipId: string) {
    await this.friendshipService.acceptFriendship(req.user.id, friendshipId);
    return { message: 'Друг добавлен' };
  }

  @Get('friends')
  async getFriends(@Request() req) {
    return this.friendshipService.getFriendsAndRequests(req.user.id);
  }
}