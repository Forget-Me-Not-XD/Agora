// ========== Imports: ==========
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    surname!: string;

    @IsEmail()
    @MaxLength(120)
    email!: string;

    /**
   * Password requirements:
   * - Minimum 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one digit
   */
    @IsString()
    @MinLength(8)
    @MaxLength(72)   // bcrypt's hard limit
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
    })
    password!: string;

    @IsEnum(Role)
    role!: Role;

    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    studyCenter!: string;
}
