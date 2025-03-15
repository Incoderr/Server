"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphqlModule = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const apollo_1 = require("@nestjs/apollo");
const path_1 = require("path");
const users_module_1 = require("../users/users.module");
const anime_module_1 = require("../anime/anime.module");
const friendship_module_1 = require("../friendship/friendship.module");
const users_resolver_1 = require("./resolvers/users.resolver");
const anime_resolver_1 = require("./resolvers/anime.resolver");
const friendship_resolver_1 = require("./resolvers/friendship.resolver");
const auth_module_1 = require("../auth/auth.module");
let GraphqlModule = class GraphqlModule {
};
exports.GraphqlModule = GraphqlModule;
exports.GraphqlModule = GraphqlModule = __decorate([
    (0, common_1.Module)({
        imports: [
            graphql_1.GraphQLModule.forRoot({
                driver: apollo_1.ApolloDriver,
                autoSchemaFile: (0, path_1.join)(process.cwd(), 'src/graphql/schema.gql'),
                context: ({ req }) => ({ req }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            anime_module_1.AnimeModule,
            friendship_module_1.FriendshipModule,
        ],
        providers: [users_resolver_1.UsersResolver, anime_resolver_1.AnimeResolver, friendship_resolver_1.FriendshipResolver],
    })
], GraphqlModule);
//# sourceMappingURL=graphql.module.js.map