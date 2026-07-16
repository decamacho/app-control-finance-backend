import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TypeTransactionService } from '../services/transaction-type.service';
import { TRANSACTION_ROUTE_PREFIX } from '../types/transactions-routes.constant';

@Controller(TRANSACTION_ROUTE_PREFIX)
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly typeTransactionService: TypeTransactionService,
  ) {}
}
