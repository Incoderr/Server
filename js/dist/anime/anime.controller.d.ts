import { AnimeService } from './anime.service';
export declare class AnimeController {
    private animeService;
    constructor(animeService: AnimeService);
    getAnimeList(query: any): Promise<import("./anime.dto").AnimeDto[]>;
    getAnime(imdbID: string): Promise<import("./anime.schema").Anime>;
    proxyAnilist(body: {
        query: string;
        variables: any;
    }): Promise<void>;
    getAdminAnimeList(): Promise<import("./anime.dto").AnimeDto[]>;
    createAnime(animeData: any): Promise<import("./anime.schema").Anime>;
    updateAnime(imdbID: string, animeData: any): Promise<import("./anime.schema").Anime>;
    deleteAnime(imdbID: string): Promise<{
        message: string;
        imdbID: string;
    }>;
}
