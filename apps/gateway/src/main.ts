import { NestFactory } from '@nestjs/core';
import { ApiModule } from './gateway.module';

async function bootstrap() {
    const app = await NestFactory.create(ApiModule);
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
