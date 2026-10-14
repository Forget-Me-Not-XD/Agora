// ========== Imports: ==========
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import {
    PASSWORD_PATTERN,
    PASSWORD_PATTERN_MESSAGE,
    PASSWORD_MIN_LENGTH_MESSAGE,
    PASSWORD_MAX_LENGTH_MESSAGE,
} from './password-rules';

export class ResetPasswordDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    token!: string;

    @IsString()
    @MinLength(8, { message: PASSWORD_MIN_LENGTH_MESSAGE })
    @MaxLength(72, { message: PASSWORD_MAX_LENGTH_MESSAGE })
    @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
    newPassword!: string;
}
