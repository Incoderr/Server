import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'anime_list' })
export class Anime extends Document {
  @Prop({ required: true })
  Title: string;

  @Prop({ required: true })
  TitleEng: string;

  @Prop({ required: true })
  Poster: string;

  @Prop()
  Backdrop: string;

  @Prop({ required: true })
  Year: string;

  @Prop({ required: true })
  Released: string;

  @Prop()
  imdbRating: string;

  @Prop({ required: true, unique: true })
  imdbID: string;

  @Prop()
  Episodes: number;

  @Prop({ type: [String], required: true, default: [] })
  Genre: string[];

  @Prop({ type: [String], default: [] })
  Tags: string[];

  @Prop({ required: true })
  OverviewRu: string;
}

export const AnimeSchema = SchemaFactory.createForClass(Anime);