// ========== Imports: ==========
import { IsString, MinLength, MaxLength, Matches } from "class-validator";

export class ChangePasswordDto {
    @IsString()
    @MinLength(1)
    currentPassword!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(72)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).+$/, {
        message: 'New password must contain at least one uppercase letter, one lowercase letter, one digit and one symbol',
    })
    newPassword!: string;
}