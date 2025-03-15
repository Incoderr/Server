import { AnimeDto } from '../anime/anime.dto';
export declare class UserDto {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role: string;
    favorites: string[];
    favoritesData?: AnimeDto[];
}
export declare class SearchUserDto {
    id: string;
    username: string;
    avatar?: string;
}
export declare class WatchStatsDto {
    plan_to_watch: number;
    watching: number;
    completed: number;
    dropped: number;
}
export declare class AuthResponseDto {
    token: string;
    user: UserDto;
}
export declare class WatchStatusDto {
    imdbID: string;
    status: string;
}
