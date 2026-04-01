import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@app/common/config/config.module';
import { LoggerModule } from 'y/logger';
import { DatabaseModule } from '@app/database';
import { RedisModule } from '@app/redis';
import { RateLimiterModule } from '@app/rate-limiter';
import { AuthModule } from './auth/auth.module';

@Module({
    imports: [
        ConfigModule,
        LoggerModule,
        DatabaseModule,
        RedisModule,
        RateLimiterModule,
        AuthModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
