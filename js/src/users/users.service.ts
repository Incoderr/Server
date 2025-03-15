import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './users.schema';
import { UserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByLogin(login: string): Promise<User> {
    return this.userModel.findOne({ $or: [{ username: login }, { email: login }] }).exec();
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<UserDto> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true },
    ).exec();
    if (!user) throw new NotFoundException('Пользователь не найден');
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      favorites: user.favorites,
    };
  }

  async addToFavorites(userId: string, imdbID: string): Promise<string[]> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $addToSet: { favorites: imdbID } },
      { new: true },
    ).exec();
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user.favorites;
  }

  async removeFromFavorites(userId: string, imdbID: string): Promise<string[]> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { favorites: imdbID } },
      { new: true },
    ).exec();
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user.favorites;
  }

  async updateWatchStatus(userId: string, imdbID: string, status: string): Promise<{ imdbID: string; status: string }[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Пользователь не найден');
    // Логика обновления статуса просмотра (зависит от вашей схемы)
    return [{ imdbID, status }]; // Пример, нужно адаптировать под вашу модель
  }

  async getWatchStats(userId: string): Promise<{ plan_to_watch: number; watching: number; completed: number; dropped: number }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Пользователь не найден');
    // Логика подсчета статуса просмотра (зависит от вашей схемы)
    return { plan_to_watch: 0, watching: 0, completed: 0, dropped: 0 }; // Пример
  }
}