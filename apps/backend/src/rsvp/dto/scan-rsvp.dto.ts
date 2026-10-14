// ========== Imports: ==========
import { IsMongoId, IsNotEmpty, IsString } from "class-validator";

export class ScanRsvpDto {
    @IsNotEmpty()
    @IsString()
    qrPayload !: string;

    // Die geleentheid waarvoor die skandeerder oop is. 'n Kaartjie vir 'n ander geleentheid word
    // afgekeur, eerder as om die gas stil by daardie geleentheid in te teken.
    @IsNotEmpty()
    @IsMongoId()
    eventId!: string;
}
