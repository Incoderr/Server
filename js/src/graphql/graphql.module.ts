import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { UsersModule } from '../users/users.module';
import { AnimeModule } from '../anime/anime.module';
import { FriendshipModule } from '../friendship/friendship.module';
import { UsersResolver } from './resolvers/users.resolver';
import { AnimeResolver } from './resolvers/anime.resolver';
import { FriendshipResolver } from './resolvers/friendship.resolver';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      context: ({ req }) => ({ req }),
    }),
    AuthModule,
    UsersModule,
    AnimeModule,
    FriendshipModule,
  ],
  providers: [UsersResolver, AnimeResolver, FriendshipResolver],
})
export class GraphqlModule {}