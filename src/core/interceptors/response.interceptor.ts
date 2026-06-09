import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data: unknown) => {
        const dataObject = data as Record<string, unknown> | null | undefined;

        const resultData =
          dataObject?.data !== undefined ? dataObject.data : data;

        const isEmptyArray =
          Array.isArray(resultData) && resultData.length === 0;

        const message =
          typeof dataObject?.message === 'string'
            ? dataObject.message
            : isEmptyArray
              ? 'No se encontraron registros disponibles'
              : 'Operación realizada con exito';

        return {
          success: true,
          statusCode,
          message,
          data: resultData,
        };
      }),
    );
  }
}
