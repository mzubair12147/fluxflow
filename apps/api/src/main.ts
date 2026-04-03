import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
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

    const corsOrigins = (process.env.CORS_ORIGIN ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.enableCors({
        origin: corsOrigins.length > 0 ? corsOrigins : true,
        credentials: true,
    });
    app.enableShutdownHooks();
    await app.listen(process.env.API_PORT ?? 3000);
}
bootstrap();
