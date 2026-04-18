import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();
    const req  = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const excRes = exception instanceof HttpException
      ? exception.getResponse()
      : null;

    // Extrai code e message do corpo da exceção
    const code   = (excRes as any)?.code    ?? null;
    const detail = (excRes as any)?.message ?? null;

    const messages: Record<number, string> = {
      400: 'Dados inválidos. Verifique as informações enviadas.',
      401: 'Sessão expirada ou inválida. Faça login novamente.',
      403: code === 'TRIAL_EXPIRED'
        ? 'Seu período de teste encerrou. Escolha um plano para continuar.'
        : 'Você não tem permissão para realizar esta ação.',
      404: 'Recurso não encontrado.',
      409: 'Conflito — este registro já existe.',
      422: 'Dados inválidos ou incompletos.',
      429: 'Muitas tentativas. Aguarde um momento e tente novamente.',
      500: 'Erro interno do servidor. Tente novamente em instantes.',
    };

    const message = messages[status] ?? detail ?? 'Erro inesperado.';

    this.logger.error(
      `${req.method} ${req.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    res.status(status).json({
      statusCode: status,
      code: code ?? `ERR_${status}`,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
