import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    async signUp(
        @Body() dto: SignUpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.signUp(dto);
        return this.handleTokenDelivery(req, res, result);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: SignInDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.signIn(dto);
        return this.handleTokenDelivery(req, res, result);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        // 1. Determine where to get the refresh token from based on client type
        const clientType = req.headers['x-client-type'] || 'web';
        let token = '';

        if (clientType === 'web') {
            // Web apps send it via HttpOnly cookie
            token = req.cookies?.refresh_token;
        } else {
            // Mobile apps send it in the JSON body
            token = dto.refreshToken;
        }

        if (!token) {
            throw new UnauthorizedException('Refresh token not provided');
        }

        // 2. Process the rotation
        const result = await this.authService.refreshTokens(token);

        // 3. Deliver the new tokens correctly
        return this.handleTokenDelivery(req, res, result);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const clientType = req.headers['x-client-type'] || 'web';
        let token = '';

        // Extract the token based on the client type
        if (clientType === 'web') {
            token = req.cookies?.refresh_token;
        } else {
            token = req.body?.refreshToken;
        }

        // If a token was provided, revoke it in the database
        if (token) {
            await this.authService.revokeSession(token);
        }

        // If it's a web client, actively clear the HttpOnly cookie
        if (clientType === 'web') {
            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });
        }

        return { message: 'Logged out successfully' };
    }

    // ==========================================
    // The Web vs Mobile Delivery Engine
    // ==========================================
    private handleTokenDelivery(req: Request, res: Response, authData: any) {
        const clientType = req.headers['x-client-type'] || 'web';

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
}
