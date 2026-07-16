import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { AlertModule } from './modules/alerts/alerts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SplitsModule } from './modules/splits/splits.module';
import { GoalsModule } from './modules/goals/goals.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true, // only development
        logging: true,
      }),
    }),
    UsersModule,
    WalletsModule,
    TransactionsModule,
    AlertModule,
    CategoriesModule,
    SplitsModule,
    GoalsModule,
    BudgetsModule,
    AuthModule,
    RedisModule,
  ],
})
export class AppModule {}
