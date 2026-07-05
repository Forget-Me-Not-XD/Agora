// ========== Imports: ==========
import { IsDateString, IsInt, Min } from "class-validator";

export class PredictDraftEventDto {
    @IsDateString()
    date!: string;

    @IsInt()
    @Min(1)
    maxCapacity!: number;
}