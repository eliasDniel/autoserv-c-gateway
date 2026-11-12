import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVICE: string;
  JWT_SERVICE: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_MODE?: string;
  TELEGRAM_WEBHOOK_URL?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_USERNAME?: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVICE: joi.string().required(),
    JWT_SERVICE: joi.string().required(),
    TELEGRAM_BOT_TOKEN: joi.string().allow('').optional(),
    TELEGRAM_MODE: joi.string().valid('polling', 'webhook').optional(),
    TELEGRAM_WEBHOOK_URL: joi.string().allow('').optional(),
    TELEGRAM_WEBHOOK_SECRET: joi.string().allow('').optional(),
    TELEGRAM_BOT_USERNAME: joi.string().allow('').optional(),
  })
  .unknown(true);

const result: { error?: { message: string }; value: EnvVars } =
  envsSchema.validate(process.env);

if (result.error) {
  throw new Error(
    `Error en la configuracion de la validacion ${result.error.message}`,
  );
}

const envVars = result.value;

export const envs = {
  port: envVars.PORT,
  natsServers: [envVars.NATS_SERVICE],
  jwtService: envVars.JWT_SERVICE,
  telegramBotToken: envVars.TELEGRAM_BOT_TOKEN || '',
  telegramMode: (envVars.TELEGRAM_MODE || 'polling') as 'polling' | 'webhook',
  telegramWebhookUrl: envVars.TELEGRAM_WEBHOOK_URL || '',
  telegramWebhookSecret: envVars.TELEGRAM_WEBHOOK_SECRET || '',
  telegramBotUsername: envVars.TELEGRAM_BOT_USERNAME || '',
};
