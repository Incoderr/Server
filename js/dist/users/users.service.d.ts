import { Model } from 'mongoose';
import { User } from './users.schema';
import { UserDto } from './users.dto';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<User>);
    findById(id: string): Promise<User>;
    findByUsername(username: string): Promise<User>;
    findByLogin(login: string): Promise<User>;
    findByEmail(email: string): Promise<User>;
    create(userData: Partial<User>): Promise<User>;
    updateAvatar(userId: string, avatarUrl: string): Promise<UserDto>;
    addToFavorites(userId: string, imdbID: string): Promise<string[]>;
    removeFromFavorites(userId: string, imdbID: string): Promise<string[]>;
    updateWatchStatus(userId: string, imdbID: string, status: string): Promise<{
        imdbID: string;
        status: string;
    }[]>;
    getWatchStats(userId: string): Promise<{
        plan_to_watch: number;
        watching: number;
        completed: number;
        dropped: number;
    }>;
}
