// ========== Imports: ==========
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, MaxLength, Matches, ValidateIf, IsOptional } from 'class-validator';
import { Role } from '../../common/enums/role.enums';

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
   * - At least one symbol (eg. !@#$%^&*)
   */
    @IsString()
    @MinLength(8)
    @MaxLength(72)   // bcrypt's hard limit
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
    })
    password!: string;

    @IsEnum(Role)
    role!: Role;

    // Required for all roles except GAS (guests have no study center)
    @ValidateIf((dto: RegisterDto) => dto.role !== Role.GAS)
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    @IsOptional()
    studyCenter?: string;
}
