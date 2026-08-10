import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import {
  TRANSACTION_ROUTES,
  TRANSACTION_ROUTE_PREFIX,
} from '../types/transactions-routes.constant';
import { TransactionsService } from '../services/transactions.service';
import { TransferService } from '../services/transfer.service';
import { TransactionHistoryService } from '../services/transaction-history.service';
import { SplitsService } from '../../splits/splits.service';
import {
  CreateTransactionDto,
  HistoryQueryDto,
  PendingQueryDto,
  RefundDto,
  SplitTransactionDto,
  TransferDto,
} from '../dto/transaction.dto';

@Controller(TRANSACTION_ROUTE_PREFIX)
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly transferService: TransferService,
    private readonly historyService: TransactionHistoryService,
    private readonly splitsService: SplitsService,
  ) {}

  @Post()
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.create(createTransactionDto, user.idUser);
  }

  @Post(TRANSACTION_ROUTES.TRANSFER)
  transfer(@Body() transferDto: TransferDto, @CurrentUser() user: User) {
    return this.transferService.transfer(transferDto, user.idUser);
  }

  @Post(TRANSACTION_ROUTES.SPLIT)
  split(
    @Body() splitTransactionDto: SplitTransactionDto,
    @CurrentUser() user: User,
  ) {
    return this.splitsService.createSplitTransaction(
      splitTransactionDto,
      user.idUser,
    );
  }

  @Post(TRANSACTION_ROUTES.REFUND)
  refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() refundDto: RefundDto,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.refund(id, refundDto, user.idUser);
  }

  @Get(TRANSACTION_ROUTES.HISTORY)
  history(
    @Query() historyQueryDto: HistoryQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.historyService.findHistory(historyQueryDto, user.idUser);
  }

  @Get(TRANSACTION_ROUTES.PENDING)
  pending(
    @Query() pendingQueryDto: PendingQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.historyService.findPending(pendingQueryDto, user.idUser);
  }

  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.transactionsService.cancel(id, user.idUser);
  }
}
