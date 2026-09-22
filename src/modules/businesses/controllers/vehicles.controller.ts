import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IdBusinessPipe } from '../../../common/pipes/id-business.pipe';
import { User } from '../../users/entities/user.entity';
import { VehiclesService } from '../services/vehicles.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleQueryDto,
} from '../dto/parking.dto';

@Controller('businesses/:idBusiness/vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Query() vehicleQueryDto: VehicleQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.vehiclesService.findAll(
      idBusiness,
      vehicleQueryDto,
      user.idUser,
    );
  }

  @Post()
  create(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser() user: User,
  ) {
    return this.vehiclesService.create(
      idBusiness,
      createVehicleDto,
      user.idUser,
    );
  }

  @Patch(':idVehicle')
  update(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Param('idVehicle', ParseUUIDPipe) idVehicle: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: User,
  ) {
    return this.vehiclesService.update(
      idBusiness,
      idVehicle,
      updateVehicleDto,
      user.idUser,
    );
  }

  @Delete(':idVehicle')
  remove(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Param('idVehicle', ParseUUIDPipe) idVehicle: string,
    @CurrentUser() user: User,
  ) {
    return this.vehiclesService.remove(idBusiness, idVehicle, user.idUser);
  }
}
