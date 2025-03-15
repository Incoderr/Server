import { FriendshipService } from '../../friendship/friendship.service';
import { FriendDto } from '../../friendship/friendship.dto';
export declare class FriendshipResolver {
    private friendshipService;
    constructor(friendshipService: FriendshipService);
    getFriends(req: any): Promise<FriendDto[]>;
    addFriend(friendUsername: string, req: any): Promise<string>;
    acceptFriend(friendshipId: string, req: any): Promise<string>;
}
