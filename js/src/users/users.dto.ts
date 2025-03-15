import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { AnimeDto } from '../anime/anime.dto';

@ObjectType()
export class UserDto {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  username: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  avatar?: string;

  @Field(() => String)
  role: string;

  @Field(() => [String])
  favorites: string[];

  @Field(() => [AnimeDto], { nullable: true })
  favoritesData?: AnimeDto[];
}

@ObjectType()
export class SearchUserDto {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  username: string;

  @Field(() => String, { nullable: true })
  avatar?: string;
}

@ObjectType()
export class WatchStatsDto {
  @Field(() => Int)
  plan_to_watch: number;

  @Field(() => Int)
  watching: number;

  @Field(() => Int)
  completed: number;

  @Field(() => Int)
  dropped: number;
}

@ObjectType()
export class AuthResponseDto {
  @Field(() => String)
  token: string;

  @Field(() => UserDto)
  user: UserDto;
}

@ObjectType()
export class WatchStatusDto {
  @Field(() => String)
  imdbID: string;

  @Field(() => String)
  status: string;
}