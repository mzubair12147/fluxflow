import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type AuthenticatedRequest = Request & { user?: { id: string; email: string } };

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    async signUp(
        @Body() dto: SignUpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.signUp(
            dto,
            this.getSessionMetadata(req),
        );
        return this.handleTokenDelivery(req, res, result);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: SignInDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.signIn(
            dto,
            this.getSessionMetadata(req),
        );
        return this.handleTokenDelivery(req, res, result);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const token = this.extractRefreshToken(req, dto);

        if (!token) {
            throw new UnauthorizedException('Refresh token not provided');
        }

        const result = await this.authService.refreshTokens(
            token,
            this.getSessionMetadata(req),
        );

        return this.handleTokenDelivery(req, res, result);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const clientType = this.getClientType(req);
        const token = this.extractRefreshToken(req, req.body ?? {});

        if (token) {
            await this.authService.revokeSession(token);
        }

        if (clientType === 'web') {
            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
        }

        return { message: 'Logged out successfully' };
    }

    @Post('email/verification/request')
    @HttpCode(HttpStatus.OK)
    async requestEmailVerification(@Body() dto: RequestEmailVerificationDto) {
        return this.authService.requestEmailVerification(dto.email);
    }

    @Post('email/verification/confirm')
    @HttpCode(HttpStatus.OK)
    async verifyEmail(@Body() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto.token);
    }

    @Post('password/forgot')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

    @Post('password/reset')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.newPassword);
    }

    @Get('oauth/providers')
    getOAuthProviders() {
        return {
            providers: this.authService.getConfiguredOAuthProviders(),
        };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Req() req: AuthenticatedRequest) {
        return { user: req.user ?? null };
    }

    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    async listSessions(@Req() req: AuthenticatedRequest) {
        if (!req.user) {
            throw new UnauthorizedException('Unauthorized');
        }

        const currentToken = this.extractRefreshToken(req, req.body ?? {});
        return this.authService.listSessions(req.user.id, currentToken);
    }

    @Delete('sessions/:sessionId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async revokeSessionById(
        @Req() req: AuthenticatedRequest,
        @Param('sessionId') sessionId: string,
    ) {
        if (!req.user) {
            throw new UnauthorizedException('Unauthorized');
        }

        await this.authService.revokeSessionById(req.user.id, sessionId);
        return { message: 'Session revoked successfully' };
    }

    @Delete('sessions')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async revokeAllSessions(
        @Req() req: AuthenticatedRequest,
        @Res({ passthrough: true }) res: Response,
        @Query('keepCurrent') keepCurrent = 'true',
    ) {
        if (!req.user) {
            throw new UnauthorizedException('Unauthorized');
        }

        const shouldKeepCurrent = keepCurrent !== 'false';
        const currentToken = shouldKeepCurrent
            ? this.extractRefreshToken(req, req.body ?? {})
            : undefined;

        await this.authService.revokeAllSessions(req.user.id, currentToken);

        if (!shouldKeepCurrent && this.getClientType(req) === 'web') {
            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
        }

        return {
            message: shouldKeepCurrent
                ? 'All other sessions revoked successfully'
                : 'All sessions revoked successfully',
        };
    }

    // ==========================================
    // The Web vs Mobile Delivery Engine
    // ==========================================
    private handleTokenDelivery(req: Request, res: Response, authData: any) {
        const clientType = this.getClientType(req);

        if (clientType === 'web' && authData.session?.refreshToken) {
            res.cookie('refresh_token', authData.session.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            // Remove from payload for web
            delete authData.session.refreshToken;
        }

        return authData;
    }

    private extractRefreshToken(
        req: Request,
        dto: { refreshToken?: string },
    ): string | undefined {
        const refreshHeader = req.headers['x-refresh-token'];
        const refreshTokenFromHeader = Array.isArray(refreshHeader)
            ? refreshHeader[0]
            : refreshHeader;

        const clientType = this.getClientType(req);

        if (clientType === 'web') {
            return (
                req.cookies?.refresh_token ??
                dto.refreshToken ??
                refreshTokenFromHeader
            );
        }

        return dto.refreshToken ?? refreshTokenFromHeader;
    }

    private getSessionMetadata(req: Request) {
        const userAgentHeader = req.headers['user-agent'];
        const userAgent = Array.isArray(userAgentHeader)
            ? userAgentHeader[0]
            : userAgentHeader;

        const forwardedForHeader = req.headers['x-forwarded-for'];
        const forwardedFor = Array.isArray(forwardedForHeader)
            ? forwardedForHeader[0]
            : forwardedForHeader;

        const ipAddress = forwardedFor
            ? forwardedFor.split(',')[0]?.trim()
            : req.ip;

        return {
            userAgent: userAgent ?? null,
            ipAddress: ipAddress ?? null,
        };
    }

    private getClientType(req: Request): 'web' | 'mobile' {
        const headerValue = req.headers['x-client-type'];
        const normalized = Array.isArray(headerValue)
            ? headerValue[0]
            : headerValue;

        return normalized === 'mobile' ? 'mobile' : 'web';
    }
}
