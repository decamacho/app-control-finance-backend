import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Category } from '../categories/entities/category.entity';
import { RolesService } from './services/roles.service';
import { RolesController } from './controllers/roles.controller';

@Module({
  controllers: [UsersController, RolesController],
  providers: [UsersService, RolesService],
  imports: [TypeOrmModule.forFeature([User, Role, Category])],
  exports: [TypeOrmModule, RolesService],
})
export class UsersModule {}
