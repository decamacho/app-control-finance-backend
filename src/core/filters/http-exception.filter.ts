import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';
    let errorName = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const exceptionObj = exceptionResponse as Record<string, unknown>;
        message = exceptionObj.message ?? exceptionObj;

        if (Array.isArray(message)) {
          message = message.join('; ');
        }

        errorName =
          typeof exceptionObj.error === 'string'
            ? exceptionObj.error
            : exception.name;
      } else {
        message = exceptionResponse;
        errorName = exception.name;
      }
    } else {
      console.error('Unhandled Exception:', exception);
      message = 'An unexpected error occurred';
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorName,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
