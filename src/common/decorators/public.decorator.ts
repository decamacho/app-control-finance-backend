import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../modules/auth/types/auth.constants';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
