import { OAuthProvider } from '../dto/sign-up.dto';

export type OAuthIdentity = {
    providerAccountId: string;
    email?: string;
    emailVerified?: boolean;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
};

export interface OAuthVerifier {
    provider: OAuthProvider;
    verify(providerToken: string): Promise<OAuthIdentity>;
    isConfigured?(): boolean;
}

export const OAUTH_VERIFIERS = 'OAUTH_VERIFIERS';
