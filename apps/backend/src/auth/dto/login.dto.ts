// ========== Imports: ==========
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  // The web always sends this. The mobile app doesn't, so it gets a long session like before.
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}