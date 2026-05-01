// ========== Imports: ==========
import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enums';

export const ROLES_KEY = 'roles';

/**
 * Mark a route as requiring one of the listed roles.
 *   @example
 *   @Roles(Role.ADMIN)
 *   @Delete(':id')
 *   removeUser(@Param('id') id: string) { ... }
 */

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);