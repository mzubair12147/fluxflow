import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { pino } from 'pino';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
    imports: [
        PinoLoggerModule.forRoot({
            pinoHttp: {
                genReqId: (req) =>
                    req.headers['x-correlation-id'] || crypto.randomUUID(),
                transport: {
                    targets: [
                        {
                            target: 'pino-pretty',
                            level: 'debug',
                            options: { colorize: true },
                        },
                        ...(process.env.NODE_ENV === 'production'
                            ? [
                                  {
                                      target: 'pino-mongodb',
                                      level: 'info',
                                      options: {
                                          uri:
                                              process.env.MONGO_LOG_URI ||
                                              'mongodb://localhost:27017/logs',
                                          collection: 'app_logs',
                                      },
                                  },
                              ]
                            : []),
                    ],
                },
            },
        }),
    ],
    providers: [LoggerService],
    exports: [LoggerService, PinoLoggerModule],
})
export class LoggerModule {}
