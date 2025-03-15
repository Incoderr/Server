import { Resolver, Query, Args } from '@nestjs/graphql';
import { AnimeService } from '../../anime/anime.service'; // Исправленный импорт
import { AnimeDto } from '../../anime/anime.dto';
import { GraphQLInt } from 'graphql';

@Resolver(() => AnimeDto)
export class AnimeResolver {
  constructor(private animeService: AnimeService) {}

  @Query(() => AnimeDto, { name: 'anime' })
  async getAnime(@Args('imdbID', { type: () => String }) imdbID: string): Promise<AnimeDto> {
    const anime = await this.animeService.findByImdbID(imdbID);
    if (!anime) {
      throw new Error('Аниме не найдено');
    }
    return {
      ...anime.toObject(),
      Genre: Array.isArray(anime.Genre) ? anime.Genre : (anime.Genre ? [anime.Genre] : []),
      Tags: Array.isArray(anime.Tags) ? anime.Tags : (anime.Tags ? [anime.Tags] : []),
    };
  }

  @Query(() => [AnimeDto], { name: 'animeList' })
  async getAnimeList(
    @Args('genre', { type: () => [String], nullable: true }) genre?: string[],
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('fields', { type: () => [String], nullable: true }) fields?: string[],
    @Args('limit', { type: () => GraphQLInt, nullable: true }) limit?: number,
    @Args('sort', { type: () => String, nullable: true }) sort?: string,
  ): Promise<AnimeDto[]> {
    const genreMapping = {
      "Экшен": "Action",
      "Приключения": "Adventure",
      "Комедия": "Comedy",
      "Драма": "Drama",
      "Этти": "Ecchi",
      "Фэнтези": "Fantasy",
      "Хоррор": "Horror",
      "Меха": "Mecha",
      "Музыка": "Music",
      "Детектив": "Mystery",
      "Психологическое": "Psychological",
      "Романтика": "Romance",
      "Научная_фантастика": "Sci-Fi",
      "Повседневность": "Slice of Life",
      "Спорт": "Sports",
      "Сверхъестественное": "Supernatural",
      "Триллер": "Thriller",
    };

    const query: any = {};
    if (genre && genre.length > 0) {
      query.Genre = { $in: genre.map(g => genreMapping[g] || g) };
    }
    if (search) {
      query.$or = [
        { Title: { $regex: new RegExp(search, 'i') } },
        { TitleEng: { $regex: new RegExp(search, 'i') } },
      ];
    }

    const animeList = await this.animeService.findAll({
      ...query,
      fields: fields?.join(' '),
      limit,
      sort,
    });

    if (animeList.length === 0) {
      throw new Error('Аниме не найдено');
    }

    return animeList;
  }
}