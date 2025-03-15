import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from '../users/users.dto';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async register(dto: {
    login: string;
    email: string;
    password: string;
    turnstileToken: string;
    role?: string;
  }): Promise<AuthResponseDto> {
    const { login, email, password, turnstileToken, role } = dto;

    const turnstileSecret = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    const isValidCaptcha = await this.validateTurnstile(turnstileToken, turnstileSecret);
    if (!isValidCaptcha) {
      throw new UnauthorizedException('Ошибка проверки капчи');
    }

    const existingUser = await this.usersService.findByLogin(login);
    if (existingUser) {
      throw new UnauthorizedException('Пользователь с таким логином уже существует');
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

  async login(dto: { login: string; password: string }): Promise<AuthResponseDto> {
    const user = await this.usersService.findByLogin(dto.login);
    if (!user || !(await argon2.verify(user.password, dto.password))) {
      throw new UnauthorizedException('Неверный логин или пароль');
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

  async validateUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email); // Используем новый метод
    if (!user) {
      throw new UnauthorizedException('Пользователь с таким email не найден');
    }

    const resetToken = this.jwtService.sign({ id: user._id }, { expiresIn: '1h' });
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;

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

  private async validateTurnstile(token: string, secret: string): Promise<boolean> {
    try {
      const response = await axios.post(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          secret,
          response: token,
        },
      );
      return response.data.success;
    } catch (error) {
      console.error('Ошибка проверки Turnstile:', error);
      return false;
    }
  }
}