// ========== Imports: ==========
import { IsNotEmpty, IsString } from "class-validator";

export class ScanRsvpDto {
    @IsNotEmpty()
    @IsString()
    qrPayload !: string;
}