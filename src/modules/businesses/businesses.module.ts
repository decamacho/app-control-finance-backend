import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesController } from './controllers/businesses.controller';
import { BusinessesService } from './services/businesses.service';
import { BusinessValidatorService } from './services/business-validator.service';
import { Business } from './entities/business.entity';

@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessValidatorService],
  imports: [TypeOrmModule.forFeature([Business])],
  exports: [TypeOrmModule, BusinessValidatorService],
})
export class BusinessesModule {}
