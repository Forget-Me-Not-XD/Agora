import { IsEnum, IsOptional } from 'class-validator';
import { UserTitle } from '../../common/enums/user-title.enum';

export class UpdateUserDto {

    @IsOptional()
    @IsEnum(UserTitle, {
        message: `Titel moet een van die volgende wees: ${Object.values(UserTitle).filter(v => v !== '').join(', ')} of 'n leë string`,
    })
    title?: UserTitle;
}