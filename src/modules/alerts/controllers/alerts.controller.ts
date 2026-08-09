import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('alert')
@UseGuards(JwtAuthGuard)
export class AlertController {}
