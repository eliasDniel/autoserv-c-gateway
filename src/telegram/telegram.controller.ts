import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { envs } from '../config/envs';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: { body: unknown },
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    if (envs.telegramMode !== 'webhook') {
      return { ok: true, ignored: true };
    }
    if (
      envs.telegramWebhookSecret &&
      secret !== envs.telegramWebhookSecret
    ) {
      throw new UnauthorizedException('Secret de webhook inválido');
    }
    const bot = this.telegramService.getBot();
    if (!bot) return { ok: false };
    await bot.handleUpdate(req.body as never);
    return { ok: true };
  }
}
