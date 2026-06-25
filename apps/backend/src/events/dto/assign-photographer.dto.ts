// ========== Imports: ==========
import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AssignPhotographerDto {
    @IsMongoId()
    @IsNotEmpty()
    photographerId!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    brief!: string;
}