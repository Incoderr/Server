import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class FriendDto {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  username: string;

  @Field(() => String, { nullable: true })
  avatar?: string;

  @Field(() => String)
  status: string; // Например, "online" или "offline"
}