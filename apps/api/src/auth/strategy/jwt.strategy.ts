import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(configService: ConfigService) {
        super({
            // Extract from the standard Authorization Bearer header
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
        });
    }

    // Whatever is returned here is automatically attached to req.user
    async validate(payload: { sub: string; email: string }) {
        if (!payload.sub) {
            throw new UnauthorizedException('Invalid token payload');
        }
        return { id: payload.sub, email: payload.email };
    }
}
