import {
    ConflictException,
    Inject,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '@app/database/schema'; // Adjust to your actual lib import
import { SignUpDto, AuthType } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { DRIZZLE } from '@app/database';

@Injectable()
export class AuthService {
    constructor(
        // Injecting your Drizzle instance from the database library
        @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
        private readonly jwtService: JwtService,
    ) {}

    async signUp(dto: SignUpDto) {
        // 1. Check if user already exists
        const existingUser = await this.db.query.users.findFirst({
            where: eq(schema.users.email, dto.email),
        });

        if (existingUser) {
            throw new ConflictException(
                'A user with this email already exists.',
            );
        }

        // 2. Prepare the password hash (if applicable)
        let passwordHash: string | null = null;
        if (dto.authType === AuthType.EMAIL && dto.password) {
            passwordHash = await bcrypt.hash(dto.password, 10);
        }

        // 3. Execute a Drizzle Transaction (All or Nothing)
        const result = await this.db.transaction(async (tx) => {
            // A. Insert Core Identity
            const [newUser] = await tx
                .insert(schema.users)
                .values({
                    email: dto.email,
                    passwordHash,
                    emailVerified:
                        dto.authType === AuthType.OAUTH ? true : false, // Google implies verified
                })
                .returning();

            // B. Insert Profile Data
            const [newProfile] = await tx
                .insert(schema.profiles)
                .values({
                    userId: newUser.id,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    avatarUrl: dto.avatarUrl,
                })
                .returning();

            // C. Insert OAuth Account (If applicable)
            if (dto.authType === AuthType.OAUTH && dto.providerToken) {
                // In a real scenario, you'd verify the providerToken with Google/Apple here first
                // to get the real providerAccountId. We'll simulate it for now.
                await tx.insert(schema.accounts).values({
                    userId: newUser.id,
                    provider: 'google', // You'd extract this dynamically
                    providerAccountId: 'extracted_id_from_token',
                });
            }

            return { user: newUser, profile: newProfile };
        });

        // 4. Generate Tokens (Access & Refresh)
        const tokens = await this.generateTokens(
            result.user.id,
            result.user.email,
        );

        // 5. Save the Refresh Token Session in DB
        await this.db.insert(schema.sessions).values({
            userId: result.user.id,
            sessionToken: tokens.refreshToken,
            // Refresh token expires in 7 days
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        // 6. Return the standardized AuthResponse
        return {
            user: {
                id: result.user.id,
                email: result.user.email,
                firstName: result.profile.firstName,
                lastName: result.profile.lastName,
            },
            session: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        };
    }

    // --- Helper Methods ---

    private async generateTokens(userId: string, email: string) {
        const payload = { sub: userId, email };

        const [accessToken, refreshToken] = await Promise.all([
            // Short-lived Access Token (15 mins)
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_ACCESS_SECRET,
                expiresIn: '15m',
            }),
            // Long-lived Refresh Token (7 days)
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: '7d',
            }),
        ]);

        return { accessToken, refreshToken };
    }

    // ... (Keep the existing signUp and generateTokens methods) ...

    async signIn(dto: SignInDto) {
        // 1. Find the user
        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.email, dto.email),
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // 2. Handle the "Wrong Auth Method" Edge Case
        if (dto.authType === AuthType.EMAIL && !user.passwordHash) {
            throw new UnauthorizedException(
                'This account was created with a social provider (e.g., Google). Please sign in using that provider.',
            );
        }

        // 3. Verify Password (if email login)
        if (dto.authType === AuthType.EMAIL && dto.password) {
            const isPasswordValid = await bcrypt.compare(
                dto.password,
                user.passwordHash!,
            );
            if (!isPasswordValid) {
                throw new UnauthorizedException('Invalid credentials');
            }
        }

        // 4. Get User Profile Data
        const profile = await this.db.query.profiles.findFirst({
            where: eq(schema.profiles.userId, user.id),
        });

        // 5. Generate New Tokens
        const tokens = await this.generateTokens(user.id, user.email);

        // 6. Save new session in the database
        await this.db.insert(schema.sessions).values({
            userId: user.id,
            sessionToken: tokens.refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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

    async refreshTokens(refreshToken: string) {
        // 1. Find the session in the database
        const session = await this.db.query.sessions.findFirst({
            where: eq(schema.sessions.sessionToken, refreshToken),
        });

        if (!session) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // 2. Check if the token has expired in the DB
        if (new Date() > session.expiresAt) {
            // Clean up the expired token
            await this.db
                .delete(schema.sessions)
                .where(eq(schema.sessions.id, session.id));
            throw new UnauthorizedException(
                'Refresh token has expired. Please log in again.',
            );
        }

        // 3. Find the user associated with this session
        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.id, session.userId),
        });

        if (!user) {
            throw new UnauthorizedException('User no longer exists');
        }

        // 4. Generate a BRAND NEW pair of tokens
        const tokens = await this.generateTokens(user.id, user.email);

        // 5. ROTATION: Delete the old session and insert the new one
        await this.db.transaction(async (tx) => {
            await tx
                .delete(schema.sessions)
                .where(eq(schema.sessions.id, session.id));

            await tx.insert(schema.sessions).values({
                userId: user.id,
                sessionToken: tokens.refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            });
        });

        return {
            session: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        };
    }

    // Add this inside your AuthService class
    async revokeSession(refreshToken: string): Promise<void> {
        if (!refreshToken) return;

        // Delete the session from the database
        await this.db
            .delete(schema.sessions)
            .where(eq(schema.sessions.sessionToken, refreshToken));
    }
}
