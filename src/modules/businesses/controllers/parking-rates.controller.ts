import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { ParkingRatesService } from '../services/parking-rates.service';
import { CreateRateDto, UpdateRateDto } from '../dto/parking.dto';

@Controller('businesses/:idBusiness/parking-rates')
@UseGuards(JwtAuthGuard)
export class ParkingRatesController {
  constructor(private readonly parkingRatesService: ParkingRatesService) {}

  @Get()
  findAll(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @CurrentUser() user: User,
  ) {
    return this.parkingRatesService.findAll(idBusiness, user.idUser);
  }

  @Post()
  create(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @Body() createRateDto: CreateRateDto,
    @CurrentUser() user: User,
  ) {
    return this.parkingRatesService.create(
      idBusiness,
      createRateDto,
      user.idUser,
    );
  }

  @Patch(':idRate')
  update(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @Param('idRate', ParseUUIDPipe) idRate: string,
    @Body() updateRateDto: UpdateRateDto,
    @CurrentUser() user: User,
  ) {
    return this.parkingRatesService.update(
      idBusiness,
      idRate,
      updateRateDto,
      user.idUser,
    );
  }

  @Delete(':idRate')
  remove(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @Param('idRate', ParseUUIDPipe) idRate: string,
    @CurrentUser() user: User,
  ) {
    return this.parkingRatesService.remove(idBusiness, idRate, user.idUser);
  }
}
