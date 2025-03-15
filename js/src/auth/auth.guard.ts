import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class AdminGuard {
  canActivate(context): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user && request.user.role === 'admin';
  }
}