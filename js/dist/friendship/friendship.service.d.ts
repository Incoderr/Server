import { Model } from 'mongoose';
import { Friendship } from './friendship.schema';
import { UsersService } from '../users/users.service';
export declare class FriendshipService {
    private friendshipModel;
    private usersService;
    constructor(friendshipModel: Model<Friendship>, usersService: UsersService);
    requestFriendship(userId: string, friendUsername: string): Promise<Friendship>;
    acceptFriendship(userId: string, friendshipId: string): Promise<Friendship>;
    getFriendsAndRequests(userId: string): Promise<{
        friends: import("mongoose").Types.ObjectId[];
        pendingRequests: (import("mongoose").Document<unknown, {}, Friendship> & Friendship & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    areFriends(userId: string, friendId: string): Promise<boolean>;
}
