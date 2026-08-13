// ========== Imports: ==========
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, MaxLength, Matches, ValidateIf, IsOptional } from 'class-validator';
import { Role } from '../../common/enums/role.enums';

export class CreateUserDto {
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

    @IsString()
    @MinLength(8)
    @MaxLength(72)     // <-- 72 is bcrypts hard limit
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).+$/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter and one digit'
    })
    password!: string;

    @IsEnum(Role)
    role!: Role;

    //Required for ADMIN, DOSENT and STUDENT — GAS and PHOTOGRAPHER have no study center
    @ValidateIf((dto: CreateUserDto) => dto.role !== Role.GAS && dto.role !== Role.PHOTOGRAPHER)
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    @IsOptional()
    studyCenter?: string;
}