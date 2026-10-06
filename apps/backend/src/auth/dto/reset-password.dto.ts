// ========== Imports: ==========
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { PASSWORD_PATTERN, PASSWORD_PATTERN_MESSAGE } from './password-rules';

export class ResetPasswordDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    token!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(72)
    @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
    newPassword!: string;
}
