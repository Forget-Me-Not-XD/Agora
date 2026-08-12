// ========== Imports: ==========
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { SsoProfile, SsoDone } from '../interfaces/sso-profile.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(config: ConfigService) {
        super ({
            clientID: config.get<string>('oauth.google.clientId')!,
            clientSecret: config.get<string>('oauth.google.clientSecret')!,
            callbackURL: config.get<string>('oauth.google.callbackUrl')!,
            scope: ['email', 'profile'],
        });
    }

    authorizationParams(): Record<string, string> {
        return { prompt: 'select_account' };
    }

    validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: SsoDone,
    ): void {
        const email = profile.emails?.[0]?.value;

        if (!email) {
            done(new Error('Google account has no verified email'));
            return;
        }

        const ssoProfile: SsoProfile = {
            ssoId: profile.id,
            email: email.toLowerCase(),
            name: profile.name?.givenName ?? profile.displayName,
            surname: profile.name?.familyName ?? '',
        };

        done(null, ssoProfile);
    }
}