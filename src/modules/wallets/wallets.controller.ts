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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { WalletsService } from './wallets.service';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallet.dto';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  create(@Body() createWalletDto: CreateWalletDto, @CurrentUser() user: User) {
    return this.walletsService.create(createWalletDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.walletsService.findAll(user.idUser);
  }

  @Get('balance/total')
  getBalanceTotal(@CurrentUser() user: User) {
    return this.walletsService.getBalanceTotal(user.idUser);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.walletsService.findOne(id, user.idUser);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWalletDto: UpdateWalletDto,
    @CurrentUser() user: User,
  ) {
    return this.walletsService.update(id, updateWalletDto, user.idUser);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.walletsService.remove(id, user.idUser);
  }
}
