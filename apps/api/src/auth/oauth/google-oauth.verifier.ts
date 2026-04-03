import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { OAuthProvider } from '../dto/sign-up.dto';
import { OAuthIdentity, OAuthVerifier } from './oauth.types';

@Injectable()
export class GoogleOAuthVerifier implements OAuthVerifier {
    readonly provider = OAuthProvider.GOOGLE;

    private readonly client = new OAuth2Client();

    constructor(private readonly configService: ConfigService) {}

    isConfigured(): boolean {
        return this.getClientIds().length > 0;
    }

    async verify(providerToken: string): Promise<OAuthIdentity> {
        const audiences = this.getClientIds();

        if (audiences.length === 0) {
            throw new BadRequestException('Google OAuth is not configured.');
        }

        const ticket = await this.client.verifyIdToken({
            idToken: providerToken,
            audience: audiences,
        });

        const payload = ticket.getPayload();
        if (!payload?.sub) {
            throw new UnauthorizedException('Invalid Google token payload.');
        }

        const nameParts = (payload.name ?? '')
            .trim()
            .split(' ')
            .filter(Boolean);

        return {
            providerAccountId: payload.sub,
            email: payload.email ?? undefined,
            emailVerified: Boolean(payload.email_verified),
            firstName: payload.given_name ?? nameParts[0] ?? undefined,
            lastName:
                payload.family_name ??
                (nameParts.length > 1
                    ? nameParts.slice(1).join(' ')
                    : undefined),
            avatarUrl: payload.picture ?? undefined,
        };
    }

    private getClientIds(): string[] {
        const rawClientIds =
            this.configService.get<string>('AUTH_GOOGLE_CLIENT_IDS') ??
            this.configService.get<string>('GOOGLE_CLIENT_ID') ??
            '';

        return rawClientIds
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
    }
}
