import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { ConfigModule } from './config/config.module';

@Module({
  providers: [CommonService],
  exports: [CommonService],
  imports: [ConfigModule],
})
export class CommonModule {}
