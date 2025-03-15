import { FriendshipService } from './friendship.service';
export declare class FriendshipController {
    private friendshipService;
    constructor(friendshipService: FriendshipService);
    requestFriendship(req: any, friendUsername: string): Promise<{
        message: string;
    }>;
    acceptFriendship(req: any, friendshipId: string): Promise<{
        message: string;
    }>;
    getFriends(req: any): Promise<{
        friends: import("mongoose").Types.ObjectId[];
        pendingRequests: (import("mongoose").Document<unknown, {}, import("./friendship.schema").Friendship> & import("./friendship.schema").Friendship & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
}
