// ========== Imports: ==========
import { SetMetadata } from "@nestjs/common";

export const SKIP_PASSWORD_CHECK_KEY = 'skipPasswordCheck';

/**
 * Mark a route as reachable even while the caller has mustChangePassword = true.
 * @example
 * @SkipPasswordCheck()
 * @Post('change-password)
 * changePassword() { ... }
 */

export const skipPasswordCheck = () => SetMetadata(SKIP_PASSWORD_CHECK_KEY, true);