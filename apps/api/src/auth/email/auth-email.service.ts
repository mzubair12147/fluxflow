import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_EMAIL_SENDER, type AuthEmailSender } from './email-sender';

@Injectable()
export class AuthEmailService {
    constructor(
        @Inject(AUTH_EMAIL_SENDER)
        private readonly emailSender: AuthEmailSender,
        private readonly configService: ConfigService,
    ) {}

    async sendEmailVerificationEmail(
        email: string,
        token: string,
    ): Promise<void> {
        const verificationUrl = this.buildActionUrl(
            'AUTH_EMAIL_VERIFICATION_URL',
            '/auth/verify-email',
            token,
        );

        await this.emailSender.send({
            to: email,
            subject: 'Verify your email',
            text: `Welcome. Verify your email by opening: ${verificationUrl}`,
            html: `<p>Welcome.</p><p>Verify your email by clicking <a href="${verificationUrl}">this link</a>.</p>`,
        });
    }

    async sendPasswordResetEmail(email: string, token: string): Promise<void> {
        const resetUrl = this.buildActionUrl(
            'AUTH_PASSWORD_RESET_URL',
            '/auth/reset-password',
            token,
        );

        await this.emailSender.send({
            to: email,
            subject: 'Reset your password',
            text: `Reset your password by opening: ${resetUrl}`,
            html: `<p>Reset your password by clicking <a href="${resetUrl}">this link</a>.</p>`,
        });
    }

    private buildActionUrl(
        explicitUrlEnvKey: string,
        fallbackPath: string,
        token: string,
    ): string {
        const explicitUrl = this.configService.get<string>(explicitUrlEnvKey);
        if (explicitUrl) {
            return this.appendTokenToUrl(explicitUrl, token);
        }

        const frontendBaseUrl =
            this.configService.get<string>('AUTH_FRONTEND_BASE_URL') ??
            'http://localhost:3000';
        const url = new URL(frontendBaseUrl);
        url.pathname = fallbackPath;
        url.search = '';
        url.searchParams.set('token', token);

        return url.toString();
    }

    private appendTokenToUrl(rawUrl: string, token: string): string {
        const url = rawUrl.startsWith('http')
            ? new URL(rawUrl)
            : new URL(rawUrl, 'http://localhost:3000');

        url.searchParams.set('token', token);
        return url.toString();
    }
}
