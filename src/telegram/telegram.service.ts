import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
import {
  Bot,
  Context,
  InlineKeyboard,
  Keyboard,
  session,
  type SessionFlavor,
} from 'grammy';
import { firstValueFrom } from 'rxjs';
import { envs } from '../config/envs';
import { NATS_SERVICE } from '../config/service';

const BTN_AGENDAR = '📅 Agendar';
const BTN_CITAS = '📋 Mis citas';
const BTN_CANCELAR = '❌ Cancelar cita';
const BTN_MENU = '🏠 Menú';

type SesionBot = {
  paso?: 'esperando_telefono' | 'agendando';
  servicioNombre?: string;
  fecha?: string;
  hora?: string;
};

type BotContext = Context & SessionFlavor<SesionBot>;

type ServicioItem = { code: string; name: string; time: string; price: number };
type ClienteTelegram = {
  id: number;
  nombre: string;
  telefono: string;
  vehiculos: { id: number; placa: string; marca: string; modelo: string; label: string }[];
};
type CitaItem = {
  id: string;
  clientName: string;
  service: string;
  date: string;
  time: string;
  status: string;
  telegramChatId?: string;
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(TelegramService.name);
  private bot: Bot<BotContext> | null = null;
  private sesiones = new Map<string, SesionBot>();

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  async onModuleInit() {
    if (!envs.telegramBotToken) {
      this.log.warn('TELEGRAM_BOT_TOKEN no configurado: bot desactivado');
      return;
    }
    this.bot = new Bot<BotContext>(envs.telegramBotToken);
    this.bot.use(
      session({
        initial: (): SesionBot => ({}),
        storage: {
          read: async (key) => this.sesiones.get(key) ?? {},
          write: async (key, value) => {
            this.sesiones.set(key, value);
          },
          delete: async (key) => {
            this.sesiones.delete(key);
          },
        },
      }),
    );
    this.registrarHandlers(this.bot);

    try {
      if (envs.telegramMode === 'webhook' && envs.telegramWebhookUrl) {
        await this.bot.api.setWebhook(envs.telegramWebhookUrl, {
          secret_token: envs.telegramWebhookSecret || undefined,
        });
        this.log.log(`Webhook Telegram: ${envs.telegramWebhookUrl}`);
      } else {
        try {
          await this.bot.api.deleteWebhook({ drop_pending_updates: false });
        } catch (err) {
          this.log.warn(
            `No se pudo limpiar webhook de Telegram (la API sigue disponible): ${String(err)}`,
          );
        }
        void this.bot
          .start({
            onStart: () => this.log.log('Bot Telegram en modo polling'),
          })
          .catch((err) => {
            this.log.error(
              `Bot Telegram no pudo iniciar polling: ${String(err)}`,
            );
          });
      }
    } catch (err) {
      this.log.error(
        `Telegram desactivado por error de red/API; el gateway sigue activo: ${String(err)}`,
      );
      this.bot = null;
    }
  }

  async onModuleDestroy() {
    if (this.bot && envs.telegramMode !== 'webhook') {
      await this.bot.stop();
    }
  }

  getBot() {
    return this.bot;
  }

  private tecladoMenu() {
    return new Keyboard()
      .text(BTN_AGENDAR)
      .row()
      .text(BTN_CITAS)
      .text(BTN_CANCELAR)
      .row()
      .text(BTN_MENU)
      .resized()
      .persistent();
  }

  private async mostrarMenu(
    ctx: BotContext,
    mensaje = 'Elige una opción:',
  ) {
    await ctx.reply(mensaje, { reply_markup: this.tecladoMenu() });
  }

  private registrarHandlers(bot: Bot<BotContext>) {
    bot.command('start', async (ctx) => {
      const token = typeof ctx.match === 'string' ? ctx.match.trim() : '';
      const chatId = String(ctx.chat.id);
      if (token) {
        try {
          await firstValueFrom(
            this.client.send('core.cliente.vincularTelegram', { token, chatId }),
          );
          await this.mostrarMenu(
            ctx,
            'Cuenta vinculada. Elige una opción para continuar.',
          );
          return;
        } catch {
          await ctx.reply(
            'El enlace no es válido o expiró. Pide uno nuevo en el taller o envía /start y tu teléfono.',
          );
          return;
        }
      }
      const cliente = await this.clientePorChat(chatId);
      if (cliente) {
        await this.mostrarMenu(
          ctx,
          `Hola ${cliente.nombre}. ¿Qué deseas hacer?`,
        );
        return;
      }
      ctx.session.paso = 'esperando_telefono';
      await ctx.reply(
        'Bienvenido a AutoServ AI.\nEnvía tu número de teléfono (ej. 0991234567) para vincular tu cuenta.',
      );
    });

    bot.on('message:text', async (ctx, next) => {
      if (ctx.session.paso !== 'esperando_telefono') return next();
      const texto = ctx.message.text.trim();
      if (texto.startsWith('/') || esBotonMenu(texto)) return next();
      const chatId = String(ctx.chat.id);
      try {
        const cliente = await firstValueFrom(
          this.client.send<ClienteTelegram>('core.cliente.vincularTelegram', {
            telefono: texto,
            chatId,
            nombre: [ctx.from?.first_name, ctx.from?.last_name]
              .filter(Boolean)
              .join(' '),
          }),
        );
        ctx.session.paso = undefined;
        await this.mostrarMenu(
          ctx,
          `Listo, ${cliente.nombre}. Elige una opción:`,
        );
      } catch {
        await ctx.reply('No se pudo vincular. Intenta de nuevo con tu teléfono.');
      }
    });

    bot.hears(BTN_AGENDAR, (ctx) => this.iniciarAgendar(ctx));
    bot.command('agendar', (ctx) => this.iniciarAgendar(ctx));

    bot.hears(BTN_CITAS, (ctx) => this.mostrarCitas(ctx));
    bot.command('miscitas', (ctx) => this.mostrarCitas(ctx));

    bot.hears(BTN_CANCELAR, (ctx) => this.iniciarCancelar(ctx));
    bot.command('cancelar', (ctx) => this.iniciarCancelar(ctx));

    bot.hears(BTN_MENU, async (ctx) => {
      ctx.session.paso = undefined;
      const chatId = String(ctx.chat.id);
      const cliente = await this.clientePorChat(chatId);
      if (!cliente) {
        ctx.session.paso = 'esperando_telefono';
        await ctx.reply(
          'Primero vincula tu cuenta. Envía tu número de teléfono.',
        );
        return;
      }
      await this.mostrarMenu(ctx, `Hola ${cliente.nombre}. ¿Qué deseas hacer?`);
    });

    bot.on('message:text', async (ctx, next) => {
      const texto = ctx.message.text.trim();
      if (texto.startsWith('/') || esBotonMenu(texto)) return next();
      if (ctx.session.paso === 'esperando_telefono') return next();
      if (ctx.session.paso === 'agendando') {
        await this.mostrarMenu(
          ctx,
          'Usa los botones de la lista o toca Menú para empezar de nuevo.',
        );
        return;
      }
      await this.mostrarMenu(
        ctx,
        'No entendí ese mensaje. Elige una opción del menú:',
      );
    });

    bot.callbackQuery(/^srv:(.+)$/, async (ctx) => {
      const codigo = ctx.match[1];
      const servicios = await firstValueFrom(
        this.client.send<ServicioItem[]>('core.servicios.listar', {}),
      );
      const servicio = servicios.find((s) => s.code === codigo);
      if (!servicio) {
        await ctx.answerCallbackQuery({ text: 'Servicio no encontrado' });
        return;
      }
      ctx.session.servicioNombre = servicio.name;
      const kb = new InlineKeyboard();
      for (let i = 1; i <= 7; i += 1) {
        const d = fechaMasDias(i);
        kb.text(d, `fec:${codigo}:${d}`).row();
      }
      await ctx.editMessageText(`Servicio: ${servicio.name}\nElige la fecha:`, {
        reply_markup: kb,
      });
      await ctx.answerCallbackQuery();
    });

    bot.callbackQuery(/^fec:(.+):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
      const codigo = ctx.match[1];
      const fecha = ctx.match[2];
      ctx.session.fecha = fecha;
      const { horas } = await firstValueFrom(
        this.client.send<{ horas: string[] }>('core.cita.horasLibres', { fecha }),
      );
      if (!horas.length) {
        await ctx.editMessageText(
          `No hay horas libres el ${fecha}. Toca Agendar e intenta otra fecha.`,
        );
        await ctx.answerCallbackQuery();
        return;
      }
      const kb = new InlineKeyboard();
      horas.forEach((h, i) => {
        kb.text(h, `hor:${codigo}:${fecha}:${h}`);
        if ((i + 1) % 3 === 0) kb.row();
      });
      await ctx.editMessageText(`Horas disponibles el ${fecha}:`, {
        reply_markup: kb,
      });
      await ctx.answerCallbackQuery();
    });

    bot.callbackQuery(
      /^hor:(.+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})$/,
      async (ctx) => {
        const codigo = ctx.match[1];
        const fecha = ctx.match[2];
        const hora = ctx.match[3];
        ctx.session.fecha = fecha;
        ctx.session.hora = hora;
        const chatId = String(ctx.chat?.id ?? ctx.from?.id);
        const cliente = await this.clientePorChat(chatId);
        const servicios = await firstValueFrom(
          this.client.send<ServicioItem[]>('core.servicios.listar', {}),
        );
        const servicio = servicios.find((s) => s.code === codigo);
        ctx.session.servicioNombre = servicio?.name ?? codigo;

        if (cliente?.vehiculos?.length) {
          const kb = new InlineKeyboard();
          cliente.vehiculos.forEach((v) => {
            kb.text(
              v.label,
              `veh:${codigo}:${fecha}:${hora}:${v.id}:${v.placa}`,
            ).row();
          });
          kb.text(
            'Sin placa / otro',
            `veh:${codigo}:${fecha}:${hora}:0:SIN-PLACA`,
          ).row();
          await ctx.editMessageText('Elige el vehículo:', { reply_markup: kb });
          await ctx.answerCallbackQuery();
          return;
        }
        await this.crearCitaDesdeBot(ctx, {
          chatId,
          cliente,
          codigo,
          fecha,
          hora,
          placa: '',
          vehiculoId: undefined,
        });
      },
    );

    bot.callbackQuery(
      /^veh:(.+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2}):(\d+):(.+)$/,
      async (ctx) => {
        const codigo = ctx.match[1];
        const fecha = ctx.match[2];
        const hora = ctx.match[3];
        const vehiculoId = Number(ctx.match[4]);
        const placa = ctx.match[5] === 'SIN-PLACA' ? '' : ctx.match[5];
        const chatId = String(ctx.chat?.id ?? ctx.from?.id);
        const cliente = await this.clientePorChat(chatId);
        await this.crearCitaDesdeBot(ctx, {
          chatId,
          cliente,
          codigo,
          fecha,
          hora,
          placa,
          vehiculoId: vehiculoId || undefined,
        });
      },
    );

    bot.callbackQuery(/^canc:(\d+)$/, async (ctx) => {
      const id = Number(ctx.match[1]);
      const chatId = String(ctx.chat?.id ?? ctx.from?.id);
      try {
        await firstValueFrom(
          this.client.send('core.cita.cancelarTelegram', { id, chatId }),
        );
        await ctx.editMessageText('Cita cancelada.');
        await ctx.reply('¿Qué deseas hacer ahora?', {
          reply_markup: this.tecladoMenu(),
        });
      } catch {
        await ctx.answerCallbackQuery({ text: 'No se pudo cancelar' });
        return;
      }
      await ctx.answerCallbackQuery();
    });

    bot.callbackQuery(/^conf:(\d+)$/, async (ctx) => {
      const id = Number(ctx.match[1]);
      const chatId = String(ctx.chat?.id ?? ctx.from?.id);
      try {
        await firstValueFrom(
          this.client.send('core.cita.confirmarTelegram', { id, chatId }),
        );
        await ctx.editMessageText('Cita confirmada. Te esperamos.');
      } catch {
        await ctx.answerCallbackQuery({ text: 'No se pudo confirmar' });
        return;
      }
      await ctx.answerCallbackQuery();
    });
  }

  private async iniciarAgendar(ctx: BotContext) {
    const chatId = String(ctx.chat!.id);
    const cliente = await this.clientePorChat(chatId);
    if (!cliente) {
      ctx.session.paso = 'esperando_telefono';
      await ctx.reply('Primero vincula tu cuenta. Envía tu teléfono.');
      return;
    }
    const servicios = await firstValueFrom(
      this.client.send<ServicioItem[]>('core.servicios.listar', {}),
    );
    if (!servicios.length) {
      await this.mostrarMenu(ctx, 'No hay servicios disponibles por ahora.');
      return;
    }
    const kb = new InlineKeyboard();
    servicios.slice(0, 12).forEach((s) => {
      kb.text(s.name, `srv:${s.code}`).row();
    });
    ctx.session.paso = 'agendando';
    await ctx.reply('¿Qué servicio necesitas? Toca una opción:', {
      reply_markup: kb,
    });
  }

  private async mostrarCitas(ctx: BotContext) {
    const chatId = String(ctx.chat!.id);
    const citas = await firstValueFrom(
      this.client.send<CitaItem[]>('core.cita.porChat', { chatId }),
    );
    if (!citas.length) {
      await this.mostrarMenu(ctx, 'No tienes citas activas.');
      return;
    }
    const texto = citas
      .map((c) => `• ${c.date} ${c.time} — ${c.service} (${c.status})`)
      .join('\n');
    await this.mostrarMenu(ctx, `Tus citas:\n${texto}`);
  }

  private async iniciarCancelar(ctx: BotContext) {
    const chatId = String(ctx.chat!.id);
    const citas = await firstValueFrom(
      this.client.send<CitaItem[]>('core.cita.porChat', { chatId }),
    );
    if (!citas.length) {
      await this.mostrarMenu(ctx, 'No tienes citas para cancelar.');
      return;
    }
    const kb = new InlineKeyboard();
    citas.forEach((c) => {
      kb.text(`${c.date} ${c.time}`, `canc:${c.id}`).row();
    });
    await ctx.reply('Elige la cita a cancelar:', { reply_markup: kb });
  }

  private async crearCitaDesdeBot(
    ctx: BotContext,
    args: {
      chatId: string;
      cliente: ClienteTelegram | null;
      codigo: string;
      fecha: string;
      hora: string;
      placa: string;
      vehiculoId?: number;
    },
  ) {
    const servicios = await firstValueFrom(
      this.client.send<ServicioItem[]>('core.servicios.listar', {}),
    );
    const servicio = servicios.find((s) => s.code === args.codigo);
    const nombreServicio = servicio?.name ?? args.codigo;
    try {
      await firstValueFrom(
        this.client.send('core.cita.guardar', {
          nombreCliente: args.cliente?.nombre || 'Cliente Telegram',
          telefono: args.cliente?.telefono || '',
          placa: args.placa,
          servicio: nombreServicio,
          fecha: args.fecha,
          hora: args.hora,
          mecanico: 'M1',
          notas: 'Agendada por Telegram',
          estado: 'confirmada',
          origen: 'telegram',
          telegramChatId: args.chatId,
          clienteId: args.cliente?.id,
          vehiculoId: args.vehiculoId,
        }),
      );
      await ctx.editMessageText(
        `Cita confirmada:\n${nombreServicio}\n${args.fecha} a las ${args.hora}` +
          (args.placa ? `\nVehículo: ${args.placa}` : ''),
      );
      ctx.session.paso = undefined;
      await ctx.reply('¿Qué deseas hacer ahora?', {
        reply_markup: this.tecladoMenu(),
      });
    } catch {
      await ctx.editMessageText(
        'Ese horario ya fue tomado. Toca Agendar e intenta otro.',
      );
    }
    await ctx.answerCallbackQuery();
  }

  private async clientePorChat(chatId: string) {
    return firstValueFrom(
      this.client.send<ClienteTelegram | null>('core.cliente.porChat', {
        chatId,
      }),
    );
  }

  @Cron('*/15 * * * *')
  async enviarRecordatorios() {
    if (!this.bot) return;
    for (const ventana of ['24h', '2h'] as const) {
      let citas: CitaItem[] = [];
      try {
        citas = await firstValueFrom(
          this.client.send<CitaItem[]>('core.cita.recordatorios', { ventana }),
        );
      } catch {
        continue;
      }
      for (const cita of citas) {
        if (!cita.telegramChatId) continue;
        const texto =
          ventana === '24h'
            ? `Recordatorio: cita mañana ${cita.time} (${cita.service}).`
            : `Recordatorio: cita en ~2 horas (${cita.time}, ${cita.service}).`;
        try {
          await this.bot.api.sendMessage(cita.telegramChatId, texto, {
            reply_markup: new InlineKeyboard()
              .text('Confirmar', `conf:${cita.id}`)
              .text('Cancelar', `canc:${cita.id}`),
          });
          await firstValueFrom(
            this.client.send('core.cita.marcarRecordatorio', {
              id: Number(cita.id),
              ventana,
            }),
          );
        } catch (err) {
          this.log.warn(`Recordatorio falló cita ${cita.id}: ${String(err)}`);
        }
      }
    }
  }
}

function esBotonMenu(texto: string) {
  return (
    texto === BTN_AGENDAR ||
    texto === BTN_CITAS ||
    texto === BTN_CANCELAR ||
    texto === BTN_MENU
  );
}

function fechaMasDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}
