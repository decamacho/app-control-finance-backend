import { Module } from '@nestjs/common';
import { AlertService } from './services/alerts.service';
import { AlertController } from './controllers/alerts.controller';

@Module({
  controllers: [AlertController],
  providers: [AlertService],
})
export class AlertModule {}
