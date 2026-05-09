// ========== Imports: ==========
import { UserResponseDto } from "../../users/dto/user-response.dto";

/**
 * Standard authentication response shape.
 * Returned by /auth/register, /auth/login, /auth/refresh.
 */

export class TokenPairDto {
    accessToken!: string;
    refreshToken!: string;
    expiresIn!: number;    // access-token lifetime in seconds
    tokenType!: 'Bearer';
    user!: UserResponseDto;
}