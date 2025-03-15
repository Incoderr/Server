export class RegisterDto {
    login: string;
    email: string;
    password: string;
    turnstileToken: string;
    role?: string;
  }
  
  export class LoginDto {
    login: string;
    password: string;
  }