import { Module } from '@nestjs/common';
import { AlertService } from './alerts.service';
import { AlertController } from './alerts.controller';

@Module({
  controllers: [AlertController],
  providers: [AlertService],
})
export class AlertModule {}
