import { Document } from 'mongoose';
export declare class User extends Document {
    username: string;
    email: string;
    password: string;
    favorites: string[];
    avatar: string;
    role: string;
    watchStatus: {
        imdbID: string;
        status: string;
    }[];
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User> & User & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>> & import("mongoose").FlatRecord<User> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
