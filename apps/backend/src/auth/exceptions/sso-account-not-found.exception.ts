// ========== Imports: ==========
import { NotFoundException } from '@nestjs/common';

export class SsoAccountNotFoundException extends NotFoundException {
    constructor(public readonly email: string) {
        super(`No account exists for ${email}`);
    }
}
