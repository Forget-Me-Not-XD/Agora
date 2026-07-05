import { IsDateString, IsOptional } from 'class-validator';

export class FindEventsQueryDto {
    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}