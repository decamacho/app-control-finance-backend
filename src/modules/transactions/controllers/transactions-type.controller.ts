import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TRANSACTION_ROUTES } from '../types/transactions-routes.constant';
import { TypeTransactionService } from '../services/transaction-type.service';
import { CreateTypeTransactionDto } from '../dto/create-type-transaction.dto';

@Controller(TRANSACTION_ROUTES.TYPES)
export class TypeTransactionsController {
  constructor(
    private readonly typeTransactionService: TypeTransactionService,
  ) {}

  @Post()
  createTypeTransaction(
    @Body() createTypeTransactionDto: CreateTypeTransactionDto,
  ) {
    return this.typeTransactionService.createTypeTransaction(
      createTypeTransactionDto,
    );
  }

  @Get()
  findAllTypeTransactions() {
    return this.typeTransactionService.findAllTypeTransactions();
  }

  @Get(`:id`)
  findOneTypeTransaction(@Param('id', ParseUUIDPipe) id: string) {
    return this.typeTransactionService.findOneTypeTransaction(id);
  }

  @Patch(`:id`)
  updateTypeTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTypeTransactionDto: CreateTypeTransactionDto,
  ) {
    return this.typeTransactionService.updateTypeTransaction(
      id,
      updateTypeTransactionDto,
    );
  }

  @Delete(`:id`)
  removeTypeTransaction(@Param('id', ParseUUIDPipe) id: string) {
    return this.typeTransactionService.removeTypeTransaction(id);
  }
}
