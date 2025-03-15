import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Friendship } from './friendship.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectModel(Friendship.name) private friendshipModel: Model<Friendship>,
    private usersService: UsersService,
  ) {}

  async requestFriendship(userId: string, friendUsername: string): Promise<Friendship> {
    const friend = await this.usersService.findByUsername(friendUsername);
    if (!friend) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (friend._id.toString() === userId) {
      throw new BadRequestException('Нельзя добавить себя в друзья');
    }

    const existingRequest = await this.friendshipModel.findOne({
      userId,
      friendId: friend._id,
    });
    if (existingRequest) {
      throw new BadRequestException('Запрос уже отправлен');
    }

    const friendship = new this.friendshipModel({
      userId,
      friendId: friend._id,
    });
    return friendship.save();
  }

  async acceptFriendship(userId: string, friendshipId: string): Promise<Friendship> {
    const friendship = await this.friendshipModel.findOne({
      _id: friendshipId,
      friendId: userId,
    });
    if (!friendship) {
      throw new NotFoundException('Запрос не найден');
    }
    if (friendship.status !== 'pending') {
      throw new BadRequestException('Запрос уже обработан');
    }

    friendship.status = 'accepted';
    return friendship.save();
  }

  async getFriendsAndRequests(userId: string) {
    const friends = await this.friendshipModel
      .find({
        $or: [{ userId }, { friendId: userId }],
        status: 'accepted',
      })
      .populate('userId', 'username avatar')
      .populate('friendId', 'username avatar')
      .exec();

    const friendList = friends.map((f) =>
      f.userId._id.toString() === userId ? f.friendId : f.userId,
    );

    const pendingRequests = await this.friendshipModel
      .find({
        friendId: userId,
        status: 'pending',
      })
      .populate('userId', 'username avatar')
      .exec();

    return { friends: friendList, pendingRequests };
  }

  async areFriends(userId: string, friendId: string): Promise<boolean> {
    const friendship = await this.friendshipModel.findOne({
      $or: [
        { userId, friendId, status: 'accepted' },
        { userId: friendId, friendId: userId, status: 'accepted' },
      ],
    });
    return !!friendship;
  }
}