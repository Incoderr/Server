import { Resolver, Query, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { FriendshipService } from '../../friendship/friendship.service';
import { FriendDto } from '../../friendship/friendship.dto';

@Resolver(() => FriendDto)
export class FriendshipResolver {
  constructor(private friendshipService: FriendshipService) {}

  @Query(() => [FriendDto], { name: 'getFriends' }) // Указываем возвращаемый тип как массив FriendDto
  @UseGuards(JwtAuthGuard)
  async getFriends(@Context('req') req): Promise<FriendDto[]> {
    const userId = req.user.id;
    const friends = await this.friendshipService.getFriends(userId);
    return friends.map(friend => ({
      id: friend._id.toString(),
      username: friend.username,
      avatar: friend.avatar,
      status: friend.status || 'offline', // Предполагаемое поле, адаптируйте под вашу модель
    }));
  }

  @Mutation('addFriend')
  @UseGuards(JwtAuthGuard)
  async addFriend(
    @Args('friendUsername') friendUsername: string,
    @Context('req') req,
  ) {
    await this.friendshipService.requestFriendship(req.user.id, friendUsername);
    return 'Запрос на дружбу отправлен';
  }

  @Mutation('acceptFriend')
  @UseGuards(JwtAuthGuard)
  async acceptFriend(
    @Args('friendshipId') friendshipId: string,
    @Context('req') req,
  ) {
    await this.friendshipService.acceptFriendship(req.user.id, friendshipId);
    return 'Друг добавлен';
  }
}