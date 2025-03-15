import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<import("../users/users.dto").AuthResponseDto>;
    login(dto: LoginDto): Promise<import("../users/users.dto").AuthResponseDto>;
}
