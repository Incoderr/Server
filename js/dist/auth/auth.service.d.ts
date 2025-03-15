import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from '../users/users.dto';
export declare class AuthService {
    private usersService;
    private jwtService;
    private mailerService;
    private configService;
    constructor(usersService: UsersService, jwtService: JwtService, mailerService: MailerService, configService: ConfigService);
    register(dto: {
        login: string;
        email: string;
        password: string;
        turnstileToken: string;
        role?: string;
    }): Promise<AuthResponseDto>;
    login(dto: {
        login: string;
        password: string;
    }): Promise<AuthResponseDto>;
    validateUser(userId: string): Promise<{
        id: string;
        username: string;
        email: string;
        avatar: string;
        role: string;
        favorites: string[];
    }>;
    forgotPassword(email: string): Promise<void>;
    private validateTurnstile;
}
