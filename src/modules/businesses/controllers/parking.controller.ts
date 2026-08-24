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
import { ParkingService } from '../services/parking.service';
import { PaymentsService } from '../services/payments.service';
import {
  ExitTicketDto,
  MonthlyActivationDto,
  RegisterEntryDto,
  TicketQueryDto,
} from '../dto/parking.dto';
import { RegisterPaymentsDto } from '../dto/payment.dto';

@Controller('parking-tickets')
@UseGuards(JwtAuthGuard)
export class ParkingController {
  constructor(
    private readonly parkingService: ParkingService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  registerEntry(
    @Body() registerEntryDto: RegisterEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.parkingService.registerEntry(registerEntryDto, user.idUser);
  }

  @Post(':idTicket/exit')
  completeExit(
    @Param('idTicket', ParseUUIDPipe) idTicket: string,
    @Body() exitTicketDto: ExitTicketDto,
    @CurrentUser() user: User,
  ) {
    return this.parkingService.completeExit(
      idTicket,
      exitTicketDto,
      user.idUser,
    );
  }

  @Post(':idTicket/monthly')
  registerMonthly(
    @Param('idTicket', ParseUUIDPipe) idTicket: string,
    @Body() monthlyActivationDto: MonthlyActivationDto,
    @CurrentUser() user: User,
  ) {
    return this.parkingService.registerMonthly(
      idTicket,
      monthlyActivationDto,
      user.idUser,
    );
  }

  @Post(':idTicket/monthly/cancel')
  cancelMonthly(
    @Param('idTicket', ParseUUIDPipe) idTicket: string,
    @CurrentUser() user: User,
  ) {
    return this.parkingService.cancelMonthly(idTicket, user.idUser);
  }

  @Post(':idTicket/payments')
  registerPayment(
    @Param('idTicket', ParseUUIDPipe) idTicket: string,
    @Body() registerPaymentsDto: RegisterPaymentsDto,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.registerTicketPayment(
      idTicket,
      registerPaymentsDto,
      user.idUser,
    );
  }

  @Get(':idTicket/payments')
  findPayments(
    @Param('idTicket', ParseUUIDPipe) idTicket: string,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.findTicketPayments(idTicket, user.idUser);
  }

  @Delete(':idTicket')
  cancel(
    @Param('idTicket', ParseUUIDPipe) idTicket: string,
    @CurrentUser() user: User,
  ) {
    return this.parkingService.cancel(idTicket, user.idUser);
  }

  @Get('active')
  findActiveByPlate(
    @Query() ticketQueryDto: TicketQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.parkingService.findActiveByPlate(ticketQueryDto, user.idUser);
  }

  @Get('actives')
  findActives(
    @Query() ticketQueryDto: TicketQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.parkingService.findActives(ticketQueryDto, user.idUser);
  }

  @Get(':idTicket')
  findOne(
    @Param('idTicket', ParseUUIDPipe) idTicket: string,
    @CurrentUser() user: User,
  ) {
    return this.parkingService.findOne(idTicket, user.idUser);
  }

  @Get()
  findAll(@Query() ticketQueryDto: TicketQueryDto, @CurrentUser() user: User) {
    return this.parkingService.findAll(ticketQueryDto, user.idUser);
  }
}
