# autoserv-c-gateway

Puerta HTTP de AutoServ AI. Traduce REST a NATS y valida el JWT.

- `GET /api/health` público
- `POST /api/auth/login` público
- `POST /api/auth/users` solo con JWT de Administrador
- `POST /api/diagnostico` con JWT de cualquier rol del taller

Variables: `PORT`, `NATS_SERVICE`, `JWT_SERVICE`. La plantilla está en `.env.template`.
