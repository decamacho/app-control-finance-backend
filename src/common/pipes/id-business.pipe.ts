import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

export const IdBusinessPipe = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException('Negocio no encontrado'),
});
