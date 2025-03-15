import { Document, Types } from 'mongoose';
export declare class Friendship extends Document {
    userId: Types.ObjectId;
    friendId: Types.ObjectId;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const FriendshipSchema: import("mongoose").Schema<Friendship, import("mongoose").Model<Friendship, any, any, any, Document<unknown, any, Friendship> & Friendship & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Friendship, Document<unknown, {}, import("mongoose").FlatRecord<Friendship>> & import("mongoose").FlatRecord<Friendship> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
