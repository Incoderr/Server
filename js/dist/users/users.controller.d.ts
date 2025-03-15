import { UsersService } from './users.service';
import { AnimeService } from '../anime/anime.service';
export declare class UsersController {
    private usersService;
    private animeService;
    constructor(usersService: UsersService, animeService: AnimeService);
    getProfile(req: any): Promise<any>;
    getProfileByUsername(username: string, req: any): Promise<void>;
    searchUser(username: string, req: any): Promise<{
        username: string;
        avatar: string;
        _id: unknown;
    }>;
    updateAvatar(req: any, avatarUrl: string): Promise<import("./users.dto").UserDto>;
    addToFavorites(req: any, imdbID: string): Promise<{
        success: boolean;
        favorites: string[];
    }>;
    removeFromFavorites(req: any, imdbID: string): Promise<{
        success: boolean;
        favorites: string[];
    }>;
    updateWatchStatus(req: any, body: {
        imdbID: string;
        status: string;
    }): Promise<{
        success: boolean;
        watchStatus: {
            imdbID: string;
            status: string;
        }[];
    }>;
    getWatchStats(req: any): Promise<{
        plan_to_watch: number;
        watching: number;
        completed: number;
        dropped: number;
    }>;
}
