import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

type RpcErrorPayload = {
  statusCode?: number | string;
  message?: unknown;
  status?: number | string;
  error?: string;
};

@Catch()
export class RpcCustomExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return response.status(status).json(body);
    }

    if (exception instanceof RpcException) {
      return this.sendRpcPayload(response, exception.getError());
    }

    const direct = this.normalizeRpcPayload(exception);
    if (direct) {
      return this.sendRpcPayload(response, direct);
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }

  private sendRpcPayload(response: Response, rpcError: unknown) {
    const payload = this.normalizeRpcPayload(rpcError);
    if (payload) {
      const status = this.resolveStatus(payload);
      return response.status(status).json({
        statusCode: status,
        message: this.resolveMessage(payload.message),
      });
    }

    return response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: typeof rpcError === 'string' ? rpcError : 'Solicitud inválida',
    });
  }

  private normalizeRpcPayload(error: unknown): RpcErrorPayload | null {
    if (error == null) return null;
    if (typeof error === 'string') {
      return { statusCode: HttpStatus.BAD_REQUEST, message: error };
    }
    if (typeof error !== 'object') return null;

    const candidate = error as RpcErrorPayload;
    if ('statusCode' in candidate && 'message' in candidate) {
      return candidate;
    }
    if (
      'status' in candidate &&
      'message' in candidate &&
      'error' in candidate
    ) {
      return {
        statusCode: candidate.status,
        message: candidate.message,
        error: candidate.error,
      };
    }
    if (candidate.status === 'error' && candidate.message != null) {
      if (typeof candidate.message === 'object') {
        return this.normalizeRpcPayload(candidate.message);
      }
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: candidate.message,
      };
    }
    return null;
  }

  private resolveStatus(payload: RpcErrorPayload): number {
    const parsed = Number(payload.statusCode ?? payload.status);
    if (!Number.isNaN(parsed) && parsed >= 400 && parsed < 600) {
      return parsed;
    }
    return HttpStatus.BAD_REQUEST;
  }

  private resolveMessage(message: unknown): string | string[] {
    if (message == null) return 'Error inesperado';
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) {
      return message.map((item) =>
        typeof item === 'string' ? item : JSON.stringify(item),
      );
    }
    return JSON.stringify(message);
  }
}
