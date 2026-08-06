// ========== Imports: ==========
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import { SsoProfile, SsoDone } from '../interfaces/sso-profile.interface';
import { access } from "fs";

interface MicrosoftGraphProfile {
    id: string;
    mail?: string;
    userPrincipalName?: string;
    givenName?: string;
    surname?: string;
    displayName: string;
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(OAuth2Strategy, 'microsoft') {
    constructor(config: ConfigService) {
        super ({
            authorizationURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            tokenURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            clientID: config.get<string>('oauth.microsoft.clientId')!,
            clientSecret: config.get<string>('oauth.microsoft.clientSecret')!,
            callbackURL: config.get<string>('oauth.microsoft.callbackUrl')!,
            scope: ['openid', 'profile', 'email', 'User.Read'],
        });
    }

    async validate(
        accessToken: string,
        _refreshToken: string,
        _profile: unknown,
        done: SsoDone,
    ): Promise<void> {
        try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: { Authorization: `Bearer ${accessToken}`},
            });

            if (!response.ok) {
                done(new Error('Failed to fetch Microsoft Profile'));
                return;
            }

            const graphProfile = (await response.json()) as MicrosoftGraphProfile;
            const email = graphProfile.mail ?? graphProfile.userPrincipalName;

            if (!email) {
                done(new Error('Microsoft account has no email'));
                return;
            }

            const ssoProfile: SsoProfile = {
                ssoId: graphProfile.id,
                email: email.toLowerCase(),
                name: graphProfile.givenName ?? graphProfile.displayName,
                surname: graphProfile.surname ?? '',
            };

            done(null, ssoProfile);
        } catch (err) {
            done(err instanceof Error ? err: new Error('Failed to fetch microsoft profile'));
        }
    }
}