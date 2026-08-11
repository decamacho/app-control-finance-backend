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
import { BusinessesService } from '../services/businesses.service';
import { CreateBusinessDto, UpdateBusinessDto } from '../dto/business.dto';

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
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
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.findOne(idBusiness, user.idUser);
  }

  @Patch(':idBusiness')
  update(
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
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
    @Param('idBusiness', ParseUUIDPipe) idBusiness: string,
    @CurrentUser() user: User,
  ) {
    return this.businessesService.remove(idBusiness, user.idUser);
  }
}
