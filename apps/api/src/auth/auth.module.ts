import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '@app/database';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@app/common/config/config.module';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategy/jwt.strategy';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { OAUTH_VERIFIERS, OAuthVerifier } from './oauth/oauth.types';
import { GoogleOAuthVerifier } from './oauth/google-oauth.verifier';
import { AuthEmailService } from './email/auth-email.service';
import {
    AUTH_EMAIL_SENDER,
    AuthEmailSender,
    ConsoleAuthEmailSender,
    createSmtpAuthEmailSender,
} from './email/email-sender';

@Module({
    imports: [
        DatabaseModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    expiresIn: '15m',
                },
            }),
        }),
    ],
    providers: [
        AuthService,
        AuthEmailService,
        JwtStrategy,
        JwtAuthGuard,
        GoogleOAuthVerifier,
        {
            provide: OAUTH_VERIFIERS,
            inject: [GoogleOAuthVerifier],
            useFactory: (
                googleVerifier: GoogleOAuthVerifier,
            ): OAuthVerifier[] => {
                if (googleVerifier.isConfigured()) {
                    return [googleVerifier];
                }

                return [];
            },
        },
        {
            provide: AUTH_EMAIL_SENDER,
            inject: [ConfigService],
            useFactory: (configService: ConfigService): AuthEmailSender => {
                const host = configService.get<string>('SMTP_HOST');
                const from = configService.get<string>('SMTP_FROM');
                const portRaw = configService.get<number | string>('SMTP_PORT');
                const port = Number(portRaw);

                if (!host || !from || !Number.isFinite(port) || port <= 0) {
                    return new ConsoleAuthEmailSender();
                }

                const secureFlag =
                    configService.get<string>('AUTH_SMTP_SECURE');
                const secure =
                    secureFlag !== undefined
                        ? secureFlag === 'true'
                        : port === 465;

                return createSmtpAuthEmailSender({
                    host,
                    port,
                    secure,
                    from,
                    user: configService.get<string>('SMTP_USER') ?? undefined,
                    pass: configService.get<string>('SMTP_PASS') ?? undefined,
                });
            },
        },
    ],
    controllers: [AuthController],
})
export class AuthModule {}
