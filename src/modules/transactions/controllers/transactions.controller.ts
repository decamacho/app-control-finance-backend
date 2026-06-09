import { Controller } from '@nestjs/common';
import { TypeTransactionService } from '../services/transaction-type.service';
import { TRANSACTION_ROUTE_PREFIX } from '../types/transactions-routes.constant';

@Controller(TRANSACTION_ROUTE_PREFIX)
export class TransactionsController {
  constructor(
    private readonly typeTransactionService: TypeTransactionService,
  ) {}
}
