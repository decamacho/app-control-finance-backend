import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../../users/entities/user.entity';
import { STATE_USER } from '../types/auth.constants';

interface RequestWithUser extends Request {
  user: User;
}

@Injectable()
export class ActiveUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user || user.statusUser !== STATE_USER.ACTIVE) {
      throw new ForbiddenException('User account is not active');
    }

    return true;
  }
}
