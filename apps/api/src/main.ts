import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GatewayModule } from 'apps/gateway/src/gateway.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
    const app = await NestFactory.create(GatewayModule, {
        bufferLogs: true,
    });

    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            disableErrorMessages: process.env.NODE_ENV === 'production',
        }),
    );

    app.use(helmet());
    app.use(cookieParser());
    app.useLogger(app.get(Logger));

    app.enableCors({
        origin: '*',
        credentials: true,
    });
    app.enableShutdownHooks();
    await app.listen(process.env.port ?? 3000);
}
bootstrap();
