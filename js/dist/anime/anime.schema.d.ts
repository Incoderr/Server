import { Document } from 'mongoose';
export declare class Anime extends Document {
    Title: string;
    TitleEng: string;
    Poster: string;
    Backdrop: string;
    Year: string;
    Released: string;
    imdbRating: string;
    imdbID: string;
    Episodes: number;
    Genre: string[];
    Tags: string[];
    OverviewRu: string;
}
export declare const AnimeSchema: import("mongoose").Schema<Anime, import("mongoose").Model<Anime, any, any, any, Document<unknown, any, Anime> & Anime & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Anime, Document<unknown, {}, import("mongoose").FlatRecord<Anime>> & import("mongoose").FlatRecord<Anime> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
