import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { UserTitle } from '../../common/enums/user-title.enum';
import { UserTag } from '../../common/enums/user-tag.enum';

export class UpdateUserDto {

    @IsOptional()
    @IsEnum(UserTitle, {
        message: `Titel moet een van die volgende wees: ${Object.values(UserTitle).filter(v => v !== '').join(', ')} of 'n leë string`,
    })
    title?: UserTitle;

    @IsOptional()
    @IsArray()
    @IsEnum(UserTag, { each: true })
    tags?: UserTag[];
}