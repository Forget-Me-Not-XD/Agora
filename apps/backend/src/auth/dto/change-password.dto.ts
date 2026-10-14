// ========== Imports: ==========
import { IsBoolean, IsOptional, IsString, MinLength, MaxLength, Matches } from "class-validator";
import {
    PASSWORD_PATTERN,
    PASSWORD_PATTERN_MESSAGE,
    PASSWORD_MIN_LENGTH_MESSAGE,
    PASSWORD_MAX_LENGTH_MESSAGE,
} from "./password-rules";

export class ChangePasswordDto {
    @IsString()
    @MinLength(1)
    currentPassword!: string;

    @IsString()
    @MinLength(8, { message: PASSWORD_MIN_LENGTH_MESSAGE })
    @MaxLength(72, { message: PASSWORD_MAX_LENGTH_MESSAGE })
    @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
    newPassword!: string;

    // For the new token pair. The web sends its remember-me choice; the mobile app doesn't and
    // gets a long session, the same as at login.
    @IsOptional()
    @IsBoolean()
    rememberMe?: boolean;
}