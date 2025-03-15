import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class AnimeDto {
  @Field(() => String)
  Title: string;

  @Field(() => String)
  TitleEng: string;

  @Field(() => String)
  Poster: string;

  @Field(() => String, { nullable: true })
  Backdrop?: string;

  @Field(() => String)
  Year: string;

  @Field(() => String)
  Released: string;

  @Field(() => String, { nullable: true })
  imdbRating?: string;

  @Field(() => String)
  imdbID: string;

  @Field(() => Int, { nullable: true })
  Episodes?: number;

  @Field(() => [String])
  Genre: string[];

  @Field(() => [String])
  Tags: string[];

  @Field(() => String)
  OverviewRu: string;
}