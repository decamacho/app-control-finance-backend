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
import { IdBusinessPipe } from '../../../common/pipes/id-business.pipe';
import { User } from '../../users/entities/user.entity';
import { ParkingRatesService } from '../services/parking-rates.service';
import { UpsertRatesDto, UpdateRateDto } from '../dto/parking.dto';

@Controller('businesses/:idBusiness/parking-rates')
@UseGuards(JwtAuthGuard)
export class ParkingRatesController {
  constructor(private readonly parkingRatesService: ParkingRatesService) {}

  @Get()
  findAll(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @CurrentUser() user: User,
  ) {
    return this.parkingRatesService.findAll(idBusiness, user.idUser);
  }

  @Post()
  upsert(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Body() upsertRatesDto: UpsertRatesDto,
    @CurrentUser() user: User,
  ) {
    return this.parkingRatesService.upsert(
      idBusiness,
      upsertRatesDto,
      user.idUser,
    );
  }

  @Patch(':idRate')
  update(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
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
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Param('idRate', ParseUUIDPipe) idRate: string,
    @CurrentUser() user: User,
  ) {
    return this.parkingRatesService.remove(idBusiness, idRate, user.idUser);
  }
}
