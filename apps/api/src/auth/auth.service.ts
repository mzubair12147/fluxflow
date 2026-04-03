import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    Logger,
    Optional,
    UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { and, desc, eq, ne } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@app/database/schema';
import { SignUpDto, AuthType, OAuthProvider } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { DRIZZLE } from '@app/common/lib';
import { ConfigService } from '@nestjs/config';
import {
    OAUTH_VERIFIERS,
    OAuthIdentity,
    OAuthVerifier,
} from './oauth/oauth.types';
import { AuthEmailService } from './email/auth-email.service';

type SessionMetadata = {
    userAgent?: string | null;
    ipAddress?: string | null;
};

@Injectable()
export class AuthService {
    private static readonly PASSWORD_ROUNDS = 10;
    private static readonly REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    private static readonly EMAIL_VERIFICATION_TTL_MINUTES = 24 * 60;
    private static readonly PASSWORD_RESET_TTL_MINUTES = 30;

    private readonly oauthVerifiers = new Map<
        OAuthProvider,
        OAuthVerifier['verify']
    >();
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly authEmailService: AuthEmailService,
        @Optional()
        @Inject(OAUTH_VERIFIERS)
        oauthVerifiers: OAuthVerifier[] = [],
    ) {
        for (const verifier of oauthVerifiers) {
            this.oauthVerifiers.set(
                verifier.provider,
                verifier.verify.bind(verifier),
            );
        }
    }

    registerOAuthVerifier(verifier: OAuthVerifier) {
        this.oauthVerifiers.set(
            verifier.provider,
            verifier.verify.bind(verifier),
        );
    }

    getConfiguredOAuthProviders(): OAuthProvider[] {
        return Array.from(this.oauthVerifiers.keys());
    }

    async signUp(dto: SignUpDto, sessionMetadata?: SessionMetadata) {
        if (dto.authType === AuthType.OAUTH) {
            return this.signInWithOAuth(
                {
                    provider: dto.provider,
                    providerToken: dto.providerToken,
                    fallbackEmail: dto.email,
                    fallbackFirstName: dto.firstName,
                    fallbackLastName: dto.lastName,
                    fallbackAvatarUrl: dto.avatarUrl,
                },
                sessionMetadata,
            );
        }

        if (!dto.email) {
            throw new BadRequestException('Email is required for Email signup');
        }

        if (!dto.firstName) {
            throw new BadRequestException(
                'First name is required for Email signup',
            );
        }

        const email = dto.email;
        const firstName = dto.firstName;

        const existingUser = await this.db.query.users.findFirst({
            where: eq(schema.users.email, email),
        });

        if (existingUser) {
            throw new ConflictException('A user with this email already exists.');
        }

        if (!dto.password) {
            throw new BadRequestException('Password is required for Email signup');
        }

        const passwordHash = await bcrypt.hash(
            dto.password,
            AuthService.PASSWORD_ROUNDS,
        );
        const verificationToken = this.generateToken();
        const verificationTokenHash = this.hashToken(verificationToken);

        const result = await this.db.transaction(async (tx) => {
            const [newUser] = await tx
                .insert(schema.users)
                .values({
                    email,
                    passwordHash,
                    emailVerified: false,
                    emailVerificationToken: verificationTokenHash,
                    emailVerificationExpiresAt:
                        this.getEmailVerificationExpiryDate(),
                })
                .returning();

            const [newProfile] = await tx
                .insert(schema.profiles)
                .values({
                    userId: newUser.id,
                    firstName,
                    lastName: dto.lastName,
                    avatarUrl: dto.avatarUrl,
                })
                .returning();

            return { user: newUser, profile: newProfile };
        });

        const response: Record<string, unknown> = {
            user: {
                id: result.user.id,
                email: result.user.email,
                firstName: result.profile.firstName,
                lastName: result.profile.lastName,
            },
            verification: {
                emailVerificationRequired: true,
                verificationExpiresAt: result.user.emailVerificationExpiresAt,
            },
        };

        if (this.shouldExposeDebugTokens()) {
            response.verification = {
                ...(response.verification as object),
                debugEmailVerificationToken: verificationToken,
            };
        }

        await this.sendEmailVerificationSafely(result.user.email, verificationToken);

        return response;
    }

    async signIn(dto: SignInDto, sessionMetadata?: SessionMetadata) {
        if (dto.authType === AuthType.OAUTH) {
            return this.signInWithOAuth(
                {
                    provider: dto.provider,
                    providerToken: dto.providerToken,
                    fallbackEmail: dto.email,
                },
                sessionMetadata,
            );
        }

        if (!dto.email) {
            throw new BadRequestException('Email is required for Email login');
        }

        const email = dto.email;

        if (!dto.password) {
            throw new BadRequestException('Password is required for Email login');
        }

        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.email, email),
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.passwordHash) {
            throw new UnauthorizedException(
                'This account was created with a social provider. Please sign in using OAuth.',
            );
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.emailVerified) {
            throw new UnauthorizedException(
                'Email is not verified. Please verify your email before signing in.',
            );
        }

        const profile = await this.db.query.profiles.findFirst({
            where: eq(schema.profiles.userId, user.id),
        });

        const tokens = await this.generateTokens(user.id, user.email);

        await this.db.transaction(async (tx) => {
            await tx
                .update(schema.users)
                .set({
                    lastLoginAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(schema.users.id, user.id));

            await tx.insert(schema.sessions).values(
                this.buildSessionInsertValues(user.id, tokens.refreshToken, sessionMetadata),
            );
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: profile?.firstName,
                lastName: profile?.lastName,
            },
            session: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        };
    }

    async refreshTokens(refreshToken: string, sessionMetadata?: SessionMetadata) {
        const payload = await this.verifyRefreshToken(refreshToken);
        const refreshTokenHash = this.hashToken(refreshToken);

        const session = await this.db.query.sessions.findFirst({
            where: eq(schema.sessions.sessionToken, refreshTokenHash),
        });

        if (!session) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        if (session.userId !== payload.sub) {
            await this.db
                .delete(schema.sessions)
                .where(eq(schema.sessions.id, session.id));
            throw new UnauthorizedException('Invalid refresh token context');
        }

        if (new Date() > session.expiresAt) {
            await this.db
                .delete(schema.sessions)
                .where(eq(schema.sessions.id, session.id));
            throw new UnauthorizedException(
                'Refresh token has expired. Please log in again.',
            );
        }

        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.id, session.userId),
        });

        if (!user) {
            throw new UnauthorizedException('User no longer exists');
        }

        const tokens = await this.generateTokens(user.id, user.email);

        await this.db.transaction(async (tx) => {
            await tx
                .delete(schema.sessions)
                .where(eq(schema.sessions.id, session.id));

            await tx.insert(schema.sessions).values(
                this.buildSessionInsertValues(user.id, tokens.refreshToken, {
                    userAgent: sessionMetadata?.userAgent ?? session.userAgent,
                    ipAddress: sessionMetadata?.ipAddress ?? session.ipAddress,
                }),
            );
        });

        return {
            session: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        };
    }

    async requestEmailVerification(email: string) {
        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.email, email),
        });

        const response: Record<string, unknown> = {
            message:
                'If an account exists, email verification instructions were generated.',
        };

        if (!user || user.emailVerified) {
            return response;
        }

        const verificationToken = this.generateToken();

        await this.db
            .update(schema.users)
            .set({
                emailVerificationToken: this.hashToken(verificationToken),
                emailVerificationExpiresAt: this.getEmailVerificationExpiryDate(),
                updatedAt: new Date(),
            })
            .where(eq(schema.users.id, user.id));

        if (this.shouldExposeDebugTokens()) {
            response.debugEmailVerificationToken = verificationToken;
        }

        await this.sendEmailVerificationSafely(user.email, verificationToken);

        return response;
    }

    async verifyEmail(token: string) {
        const hashedToken = this.hashToken(token);

        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.emailVerificationToken, hashedToken),
        });

        if (!user) {
            throw new UnauthorizedException('Invalid email verification token');
        }

        if (
            user.emailVerificationExpiresAt &&
            new Date() > user.emailVerificationExpiresAt
        ) {
            await this.db
                .update(schema.users)
                .set({
                    emailVerificationToken: null,
                    emailVerificationExpiresAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(schema.users.id, user.id));
            throw new UnauthorizedException(
                'Email verification token expired. Request a new one.',
            );
        }

        await this.db
            .update(schema.users)
            .set({
                emailVerified: true,
                emailVerifiedAt: new Date(),
                emailVerificationToken: null,
                emailVerificationExpiresAt: null,
                updatedAt: new Date(),
            })
            .where(eq(schema.users.id, user.id));

        return { message: 'Email verified successfully.' };
    }

    async forgotPassword(email: string) {
        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.email, email),
        });

        const response: Record<string, unknown> = {
            message: 'If an account exists, password reset instructions were generated.',
        };

        if (!user || !user.passwordHash) {
            return response;
        }

        const resetToken = this.generateToken();

        await this.db
            .update(schema.users)
            .set({
                passwordResetToken: this.hashToken(resetToken),
                passwordResetExpiresAt: this.getPasswordResetExpiryDate(),
                updatedAt: new Date(),
            })
            .where(eq(schema.users.id, user.id));

        if (this.shouldExposeDebugTokens()) {
            response.debugPasswordResetToken = resetToken;
        }

        await this.sendPasswordResetSafely(user.email, resetToken);

        return response;
    }

    async resetPassword(token: string, newPassword: string) {
        const hashedToken = this.hashToken(token);
        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.passwordResetToken, hashedToken),
        });

        if (!user) {
            throw new UnauthorizedException('Invalid password reset token');
        }

        if (user.passwordResetExpiresAt && new Date() > user.passwordResetExpiresAt) {
            await this.db
                .update(schema.users)
                .set({
                    passwordResetToken: null,
                    passwordResetExpiresAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(schema.users.id, user.id));
            throw new UnauthorizedException(
                'Password reset token expired. Request a new one.',
            );
        }

        const passwordHash = await bcrypt.hash(
            newPassword,
            AuthService.PASSWORD_ROUNDS,
        );

        await this.db.transaction(async (tx) => {
            await tx
                .update(schema.users)
                .set({
                    passwordHash,
                    passwordResetToken: null,
                    passwordResetExpiresAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(schema.users.id, user.id));

            await tx
                .delete(schema.sessions)
                .where(eq(schema.sessions.userId, user.id));
        });

        return { message: 'Password reset successful. Please log in again.' };
    }

    async listSessions(userId: string, currentRefreshToken?: string) {
        const currentRefreshTokenHash = currentRefreshToken
            ? this.hashToken(currentRefreshToken)
            : null;

        const sessions = await this.db
            .select({
                id: schema.sessions.id,
                sessionToken: schema.sessions.sessionToken,
                expiresAt: schema.sessions.expiresAt,
                userAgent: schema.sessions.userAgent,
                ipAddress: schema.sessions.ipAddress,
            })
            .from(schema.sessions)
            .where(eq(schema.sessions.userId, userId))
            .orderBy(desc(schema.sessions.expiresAt));

        return {
            sessions: sessions.map((session) => ({
                id: session.id,
                expiresAt: session.expiresAt,
                userAgent: session.userAgent,
                ipAddress: session.ipAddress,
                isCurrent:
                    currentRefreshTokenHash !== null &&
                    session.sessionToken === currentRefreshTokenHash,
            })),
        };
    }

    async revokeSession(refreshToken: string): Promise<void> {
        if (!refreshToken) return;

        const refreshTokenHash = this.hashToken(refreshToken);
        await this.db
            .delete(schema.sessions)
            .where(eq(schema.sessions.sessionToken, refreshTokenHash));
    }

    async revokeSessionById(userId: string, sessionId: string) {
        await this.db
            .delete(schema.sessions)
            .where(
                and(
                    eq(schema.sessions.id, sessionId),
                    eq(schema.sessions.userId, userId),
                ),
            );
    }

    async revokeAllSessions(userId: string, keepRefreshToken?: string) {
        if (!keepRefreshToken) {
            await this.db
                .delete(schema.sessions)
                .where(eq(schema.sessions.userId, userId));
            return;
        }

        const keepRefreshTokenHash = this.hashToken(keepRefreshToken);
        await this.db
            .delete(schema.sessions)
            .where(
                and(
                    eq(schema.sessions.userId, userId),
                    ne(schema.sessions.sessionToken, keepRefreshTokenHash),
                ),
            );
    }

    private async signInWithOAuth(
        input: {
            provider?: OAuthProvider;
            providerToken?: string;
            fallbackEmail?: string;
            fallbackFirstName?: string;
            fallbackLastName?: string;
            fallbackAvatarUrl?: string;
        },
        sessionMetadata?: SessionMetadata,
    ) {
        if (!input.provider || !input.providerToken) {
            throw new BadRequestException(
                'OAuth provider and provider token are required for OAuth authentication.',
            );
        }

        const provider = input.provider;
        const providerToken = input.providerToken;

        const identity = await this.verifyOAuthIdentity(
            provider,
            providerToken,
        );

        const existingAccount = await this.db.query.accounts.findFirst({
            where: and(
                eq(schema.accounts.provider, provider),
                eq(schema.accounts.providerAccountId, identity.providerAccountId),
            ),
        });

        const result = await this.db.transaction(async (tx) => {
            if (existingAccount) {
                const existingUser = await tx.query.users.findFirst({
                    where: eq(schema.users.id, existingAccount.userId),
                });

                if (!existingUser) {
                    throw new UnauthorizedException('OAuth account is not linked properly.');
                }

                await tx
                    .update(schema.users)
                    .set({
                        emailVerified: true,
                        emailVerifiedAt:
                            existingUser.emailVerifiedAt ?? new Date(),
                        lastLoginAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.users.id, existingUser.id));

                const profile = await tx.query.profiles.findFirst({
                    where: eq(schema.profiles.userId, existingUser.id),
                });

                return { user: existingUser, profile };
            }

            const email = identity.email ?? input.fallbackEmail;
            if (!email) {
                throw new BadRequestException(
                    'OAuth identity did not provide an email.',
                );
            }

            let user = await tx.query.users.findFirst({
                where: eq(schema.users.email, email),
            });

            if (!user) {
                [user] = await tx
                    .insert(schema.users)
                    .values({
                        email,
                        emailVerified: identity.emailVerified ?? true,
                        emailVerifiedAt: new Date(),
                        lastLoginAt: new Date(),
                    })
                    .returning();
            } else {
                await tx
                    .update(schema.users)
                    .set({
                        emailVerified: true,
                        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
                        lastLoginAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.users.id, user.id));
            }

            const existingProfile = await tx.query.profiles.findFirst({
                where: eq(schema.profiles.userId, user.id),
            });

            let profile = existingProfile;
            if (!profile) {
                [profile] = await tx
                    .insert(schema.profiles)
                    .values({
                        userId: user.id,
                        firstName:
                            identity.firstName ?? input.fallbackFirstName ?? 'User',
                        lastName: identity.lastName ?? input.fallbackLastName,
                        avatarUrl: identity.avatarUrl ?? input.fallbackAvatarUrl,
                    })
                    .returning();
            }

            await tx.insert(schema.accounts).values({
                userId: user.id,
                provider,
                providerAccountId: identity.providerAccountId,
            });

            return { user, profile };
        });

        const tokens = await this.generateTokens(result.user.id, result.user.email);
        await this.db.insert(schema.sessions).values(
            this.buildSessionInsertValues(
                result.user.id,
                tokens.refreshToken,
                sessionMetadata,
            ),
        );

        return {
            user: {
                id: result.user.id,
                email: result.user.email,
                firstName: result.profile?.firstName,
                lastName: result.profile?.lastName,
            },
            session: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        };
    }

    private async verifyOAuthIdentity(
        provider: OAuthProvider,
        providerToken: string,
    ): Promise<OAuthIdentity> {
        const verifier = this.oauthVerifiers.get(provider);
        if (!verifier) {
            throw new BadRequestException(
                `OAuth provider '${provider}' is not configured yet.`,
            );
        }

        try {
            return await verifier(providerToken);
        } catch {
            throw new UnauthorizedException('Invalid OAuth provider token');
        }
    }

    private async verifyRefreshToken(refreshToken: string) {
        const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

        if (!refreshSecret) {
            throw new Error('JWT refresh secret is missing in configuration');
        }

        try {
            return await this.jwtService.verifyAsync<{ sub: string; email: string }>(
                refreshToken,
                {
                    secret: refreshSecret,
                },
            );
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    private async generateTokens(userId: string, email: string) {
        const payload = { sub: userId, email };
        const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
        const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

        if (!accessSecret || !refreshSecret) {
            throw new Error('JWT secrets are missing in configuration');
        }

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: accessSecret,
                expiresIn: '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: refreshSecret,
                expiresIn: '7d',
            }),
        ]);

        return { accessToken, refreshToken };
    }

    private buildSessionInsertValues(
        userId: string,
        refreshToken: string,
        sessionMetadata?: SessionMetadata,
    ) {
        return {
            userId,
            sessionToken: this.hashToken(refreshToken),
            expiresAt: new Date(Date.now() + AuthService.REFRESH_TOKEN_TTL_MS),
            userAgent: sessionMetadata?.userAgent,
            ipAddress: sessionMetadata?.ipAddress,
        };
    }

    private getEmailVerificationExpiryDate(): Date {
        return new Date(
            Date.now() +
                this.getTtlMinutes(
                    'AUTH_EMAIL_VERIFICATION_TTL_MINUTES',
                    AuthService.EMAIL_VERIFICATION_TTL_MINUTES,
                ) *
                    60 *
                    1000,
        );
    }

    private getPasswordResetExpiryDate(): Date {
        return new Date(
            Date.now() +
                this.getTtlMinutes(
                    'AUTH_PASSWORD_RESET_TTL_MINUTES',
                    AuthService.PASSWORD_RESET_TTL_MINUTES,
                ) *
                    60 *
                    1000,
        );
    }

    private getTtlMinutes(envKey: string, fallback: number): number {
        const raw = this.configService.get<string | number>(envKey);
        const value = Number(raw);
        if (Number.isFinite(value) && value > 0) {
            return value;
        }
        return fallback;
    }

    private shouldExposeDebugTokens(): boolean {
        const explicit = this.configService.get<string>('AUTH_RETURN_DEBUG_TOKENS');
        if (explicit === 'true') return true;
        if (explicit === 'false') return false;
        return this.configService.get<string>('NODE_ENV') !== 'production';
    }

    private async sendEmailVerificationSafely(email: string, token: string) {
        try {
            await this.authEmailService.sendEmailVerificationEmail(email, token);
        } catch (error) {
            this.logger.error(
                `Failed to send verification email to ${email}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private async sendPasswordResetSafely(email: string, token: string) {
        try {
            await this.authEmailService.sendPasswordResetEmail(email, token);
        } catch (error) {
            this.logger.error(
                `Failed to send password reset email to ${email}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private generateToken(): string {
        return randomBytes(32).toString('hex');
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }
}
