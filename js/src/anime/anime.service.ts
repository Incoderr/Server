import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Anime } from './anime.schema';
import { AnimeDto } from './anime.dto';

@Injectable()
export class AnimeService {
  constructor(@InjectModel(Anime.name) private animeModel: Model<Anime>) {}

  async findAll(query: any): Promise<AnimeDto[]> {
    let dbQuery = this.animeModel.find(query);
    if (query.fields) dbQuery = dbQuery.select(query.fields.split(',').join(' '));
    if (query.limit) dbQuery = dbQuery.limit(parseInt(query.limit));
    if (query.sort) dbQuery = dbQuery.sort(query.sort);
    
    const animeList = await dbQuery.exec();
    return animeList.map(anime => ({
      ...anime.toObject(),
      Genre: Array.isArray(anime.Genre) ? anime.Genre : (anime.Genre ? [anime.Genre] : []),
    }));
  }

  async findByImdbID(imdbID: string): Promise<Anime> {
    return this.animeModel.findOne({ imdbID }).exec();
  }

  async create(animeData: Partial<Anime>): Promise<Anime> {
    const anime = new this.animeModel(animeData);
    return anime.save();
  }

  async update(imdbID: string, animeData: Partial<Anime>): Promise<Anime> {
    return this.animeModel.findOneAndUpdate(
      { imdbID },
      animeData,
      { new: true, runValidators: true },
    ).exec();
  }

  async delete(imdbID: string): Promise<any> {
    return this.animeModel.findOneAndDelete({ imdbID }).exec();
  }
}