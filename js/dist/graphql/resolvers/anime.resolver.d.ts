import { AnimeService } from '../../anime/anime.service';
import { AnimeDto } from '../../anime/anime.dto';
export declare class AnimeResolver {
    private animeService;
    constructor(animeService: AnimeService);
    getAnime(imdbID: string): Promise<AnimeDto>;
    getAnimeList(genre?: string[], search?: string, fields?: string[], limit?: number, sort?: string): Promise<AnimeDto[]>;
}
