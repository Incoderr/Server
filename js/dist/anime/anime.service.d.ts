import { Model } from 'mongoose';
import { Anime } from './anime.schema';
import { AnimeDto } from './anime.dto';
export declare class AnimeService {
    private animeModel;
    constructor(animeModel: Model<Anime>);
    findAll(query: any): Promise<AnimeDto[]>;
    findByImdbID(imdbID: string): Promise<Anime>;
    create(animeData: Partial<Anime>): Promise<Anime>;
    update(imdbID: string, animeData: Partial<Anime>): Promise<Anime>;
    delete(imdbID: string): Promise<any>;
}
