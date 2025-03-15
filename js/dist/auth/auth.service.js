"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const mailer_1 = require("@nestjs-modules/mailer");
const config_1 = require("@nestjs/config");
const argon2 = require("argon2");
const users_service_1 = require("../users/users.service");
const axios_1 = require("axios");
let AuthService = class AuthService {
    constructor(usersService, jwtService, mailerService, configService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.mailerService = mailerService;
        this.configService = configService;
    }
    async register(dto) {
        const { login, email, password, turnstileToken, role } = dto;
        const turnstileSecret = this.configService.get('TURNSTILE_SECRET_KEY');
        const isValidCaptcha = await this.validateTurnstile(turnstileToken, turnstileSecret);
        if (!isValidCaptcha) {
            throw new common_1.UnauthorizedException('Ошибка проверки капчи');
        }
        const existingUser = await this.usersService.findByLogin(login);
        if (existingUser) {
            throw new common_1.UnauthorizedException('Пользователь с таким логином уже существует');
        }
        const hashedPassword = await argon2.hash(password);
        const user = await this.usersService.create({
            username: login,
            email,
            password: hashedPassword,
            role: role || 'user',
            avatar: '',
            favorites: [],
        });
        const token = this.jwtService.sign({ id: user._id });
        return {
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                favorites: user.favorites,
            },
        };
    }
    async login(dto) {
        const user = await this.usersService.findByLogin(dto.login);
        if (!user || !(await argon2.verify(user.password, dto.password))) {
            throw new common_1.UnauthorizedException('Неверный логин или пароль');
        }
        const token = this.jwtService.sign({ id: user._id });
        return {
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                favorites: user.favorites,
            },
        };
    }
    async validateUser(userId) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Пользователь не найден');
        }
        return {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            favorites: user.favorites,
        };
    }
    async forgotPassword(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.UnauthorizedException('Пользователь с таким email не найден');
        }
        const resetToken = this.jwtService.sign({ id: user._id }, { expiresIn: '1h' });
        const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
        await this.mailerService.sendMail({
            to: email,
            subject: 'Сброс пароля',
            template: 'reset-password',
            context: {
                username: user.username,
                resetUrl,
            },
        });
    }
    async validateTurnstile(token, secret) {
        try {
            const response = await axios_1.default.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                secret,
                response: token,
            });
            return response.data.success;
        }
        catch (error) {
            console.error('Ошибка проверки Turnstile:', error);
            return false;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        mailer_1.MailerService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map