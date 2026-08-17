// ========== Imports ==========
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { SKIP_PASSWORD_CHECK_KEY } from "../../common/decorators/skip-password-check.decorator";
import { JwtPayload } from "../strategies/jwt.strategy";
import { Observable } from "rxjs";

// Guard that activates the JWT Passport strategy, then blocks any request from a user that still has the mustChangePassword flag set.

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
    constructor (private readonly reflector: Reflector) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise <boolean> {
        const authenticated = (await super.canActivate(context)) as boolean;
        if (!authenticated) return false;

        const skipPasswordCheck = this.reflector.getAllAndOverride<boolean>(SKIP_PASSWORD_CHECK_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skipPasswordCheck) return true;

        const request = context.switchToHttp().getRequest();
        const user: JwtPayload = request.user;

        if (user.mustChangePassword) {
            throw new ForbiddenException('Jy moet eers jou wagwoord verander voordat jy kan voortgaan.');
        }

        return true;
    }
}