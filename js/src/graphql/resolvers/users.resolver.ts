import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { UsersService } from '../../users/users.service';
import { AnimeService } from '../../anime/anime.service';
import { AuthService } from '../../auth/auth.service';
import { FriendshipService } from '../../friendship/friendship.service';
import { UserDto, SearchUserDto, WatchStatsDto, AuthResponseDto, WatchStatusDto } from '../../users/users.dto';

@Resolver(() => UserDto)
export class UsersResolver {
  constructor(
    private usersService: UsersService,
    private animeService: AnimeService,
    private authService: AuthService,
    private friendshipService: FriendshipService,
  ) {}

  @Query(() => UserDto, { name: 'profile' })
  @UseGuards(JwtAuthGuard)
  async getProfile(@Context('req') req): Promise<UserDto> {
    const user = await this.usersService.findById(req.user.id);
    const favoritesData = await Promise.all(
      user.favorites.map((imdbID) => this.animeService.findByImdbID(imdbID)),
    );
    return { ...user.toObject(), favoritesData };
  }

  @Query(() => UserDto, { name: 'profileByUsername' }) // Указываем тип
  @UseGuards(JwtAuthGuard)
  async getProfileByUsername(
    @Args('username', { type: () => String }) username: string,
    @Context('req') req,
  ): Promise<UserDto> {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new Error('Пользователь не найден');

    const isCurrentUser = req.user.username === username;
    const areFriends = await this.friendshipService.areFriends(req.user.id, user._id.toString());

    if (!isCurrentUser && !areFriends) {
      throw new Error('Доступ запрещён: пользователь не является вашим другом');
    }

    const favoritesData = await Promise.all(
      user.favorites.map((imdbID) => this.animeService.findByImdbID(imdbID)),
    );
    return { ...user.toObject(), favoritesData };
  }

  @Query(() => SearchUserDto, { name: 'searchUser' }) // Указываем тип
  @UseGuards(JwtAuthGuard)
  async searchUser(
    @Args('username', { type: () => String }) username: string,
    @Context('req') req,
  ): Promise<SearchUserDto> {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new Error('Пользователь не найден');
    if (user._id.toString() === req.user.id) {
      throw new Error('Нельзя добавить себя в друзья');
    }
    return { id: user._id.toString(), username: user.username, avatar: user.avatar };
  }

  @Query(() => WatchStatsDto, { name: 'watchStats' }) // Указываем тип
  @UseGuards(JwtAuthGuard)
  async getWatchStats(@Context('req') req): Promise<WatchStatsDto> {
    return this.usersService.getWatchStats(req.user.id);
  }

  @Mutation(() => AuthResponseDto, { name: 'register' }) // Указываем тип
  async register(
    @Args('login', { type: () => String }) login: string,
    @Args('email', { type: () => String }) email: string,
    @Args('password', { type: () => String }) password: string,
    @Args('turnstileToken', { type: () => String }) turnstileToken: string,
    @Args('role', { type: () => String, nullable: true }) role?: string,
  ): Promise<AuthResponseDto> {
    return this.authService.register({ login, email, password, turnstileToken, role });
  }

  @Mutation(() => AuthResponseDto, { name: 'login' }) // Указываем тип
  async login(
    @Args('login', { type: () => String }) login: string,
    @Args('password', { type: () => String }) password: string,
  ): Promise<AuthResponseDto> {
    return this.authService.login({ login, password });
  }

  @Mutation(() => [String], { name: 'addToFavorites' }) // Указываем тип
  @UseGuards(JwtAuthGuard)
  async addToFavorites(
    @Args('imdbID', { type: () => String }) imdbID: string,
    @Context('req') req,
  ): Promise<string[]> {
    return this.usersService.addToFavorites(req.user.id, imdbID);
  }

  @Mutation(() => [String], { name: 'removeFromFavorites' }) // Указываем тип
  @UseGuards(JwtAuthGuard)
  async removeFromFavorites(
    @Args('imdbID', { type: () => String }) imdbID: string,
    @Context('req') req,
  ): Promise<string[]> {
    return this.usersService.removeFromFavorites(req.user.id, imdbID);
  }

  @Mutation(() => [WatchStatusDto], { name: 'updateWatchStatus' }) // Указываем тип
  @UseGuards(JwtAuthGuard)
  async updateWatchStatus(
    @Args('imdbID', { type: () => String }) imdbID: string,
    @Args('status', { type: () => String }) status: string,
    @Context('req') req,
  ): Promise<WatchStatusDto[]> {
    return this.usersService.updateWatchStatus(req.user.id, imdbID, status);
  }

  @Mutation(() => UserDto, { name: 'updateAvatar' }) // Указываем тип
  @UseGuards(JwtAuthGuard)
  async updateAvatar(
    @Args('avatarUrl', { type: () => String }) avatarUrl: string,
    @Context('req') req,
  ): Promise<UserDto> {
    return this.usersService.updateAvatar(req.user.id, avatarUrl);
  }
}