import { UsersService } from '../../users/users.service';
import { AnimeService } from '../../anime/anime.service';
import { AuthService } from '../../auth/auth.service';
import { FriendshipService } from '../../friendship/friendship.service';
import { UserDto, SearchUserDto, WatchStatsDto, AuthResponseDto, WatchStatusDto } from '../../users/users.dto';
export declare class UsersResolver {
    private usersService;
    private animeService;
    private authService;
    private friendshipService;
    constructor(usersService: UsersService, animeService: AnimeService, authService: AuthService, friendshipService: FriendshipService);
    getProfile(req: any): Promise<UserDto>;
    getProfileByUsername(username: string, req: any): Promise<UserDto>;
    searchUser(username: string, req: any): Promise<SearchUserDto>;
    getWatchStats(req: any): Promise<WatchStatsDto>;
    register(login: string, email: string, password: string, turnstileToken: string, role?: string): Promise<AuthResponseDto>;
    login(login: string, password: string): Promise<AuthResponseDto>;
    addToFavorites(imdbID: string, req: any): Promise<string[]>;
    removeFromFavorites(imdbID: string, req: any): Promise<string[]>;
    updateWatchStatus(imdbID: string, status: string, req: any): Promise<WatchStatusDto[]>;
    updateAvatar(avatarUrl: string, req: any): Promise<UserDto>;
}
