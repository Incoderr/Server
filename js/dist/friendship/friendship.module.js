"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendshipModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const friendship_service_1 = require("./friendship.service");
const friendship_controller_1 = require("./friendship.controller");
const friendship_schema_1 = require("./friendship.schema");
const users_module_1 = require("../users/users.module");
let FriendshipModule = class FriendshipModule {
};
exports.FriendshipModule = FriendshipModule;
exports.FriendshipModule = FriendshipModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: friendship_schema_1.Friendship.name, schema: friendship_schema_1.FriendshipSchema }]),
            users_module_1.UsersModule,
        ],
        providers: [friendship_service_1.FriendshipService],
        controllers: [friendship_controller_1.FriendshipController],
        exports: [friendship_service_1.FriendshipService],
    })
], FriendshipModule);
//# sourceMappingURL=friendship.module.js.map