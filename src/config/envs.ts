import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVICE: string;
  JWT_SERVICE: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVICE: joi.string().required(),
    JWT_SERVICE: joi.string().required(),
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
};
