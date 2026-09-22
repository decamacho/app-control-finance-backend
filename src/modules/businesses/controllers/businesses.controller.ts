import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IdBusinessPipe } from '../../../common/pipes/id-business.pipe';
import { User } from '../../users/entities/user.entity';
import { BusinessesService } from '../services/businesses.service';
import { CreateBusinessDto, UpdateBusinessDto } from '../dto/business.dto';

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(
    @Body() createBusinessDto: CreateBusinessDto,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.create(createBusinessDto, user.idUser);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.businessesService.findAll(user.idUser);
  }

  @Get(':idBusiness')
  findOne(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.findOne(idBusiness, user.idUser);
  }

  @Patch(':idBusiness')
  update(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.update(
      idBusiness,
      updateBusinessDto,
      user.idUser,
    );
  }

  @Delete(':idBusiness')
  remove(
    @Param('idBusiness', IdBusinessPipe) idBusiness: string,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.remove(idBusiness, user.idUser);
  }
}
