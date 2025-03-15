import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnimeService } from './anime.service';
import { AnimeController } from './anime.controller';
import { Anime, AnimeSchema } from './anime.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Anime.name, schema: AnimeSchema }])],
  providers: [AnimeService],
  controllers: [AnimeController],
  exports: [AnimeService],
})
export class AnimeModule {}