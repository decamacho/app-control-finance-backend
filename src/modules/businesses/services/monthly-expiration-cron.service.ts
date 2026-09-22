import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MonthlyBillingService } from './monthly-billing.service';

@Injectable()
export class MonthlyExpirationCronService {
  private readonly logger = new Logger(MonthlyExpirationCronService.name);

  constructor(private readonly billingService: MonthlyBillingService) {}

  @Cron('0 6 * * *', { timeZone: 'America/Bogota' })
  async handleExpiration() {
    this.logger.log('Verificando mensualidades expiradas...');
    const expired = await this.billingService.expire();
    this.logger.log(`${expired} mensualidades expiradas`);
  }
}
