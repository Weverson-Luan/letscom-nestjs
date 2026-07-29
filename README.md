# Letscom Backend — NestJS

Migração do backend Laravel 11 (`letscom-backend`) para **NestJS + TypeScript + Prisma + MySQL**, mantendo o mesmo comportamento e contrato de API (mesmos paths, payloads e prefixo global `APP_CONTEXT`).

> Projeto **novo**, isolado dos arquivos Laravel. Nada do backend original é alterado.

## Stack

NestJS · TypeScript · Prisma ORM · MySQL/MariaDB · Redis (cache) · JWT + Passport · bcrypt · class-validator/transformer · Swagger · Winston · Docker · ESLint/Prettier.

## Arquitetura (Clean Architecture modular)

```
src/
├── modules/            # 1 módulo por domínio (auth, users, remessas, ...)
│   └── <dominio>/{controllers,use-cases,services,repositories,dto,mappers,...}
├── shared/             # infra transversal
│   ├── prisma/         # PrismaService (@Global)
│   ├── guards/         # JwtStrategy, JwtAuthGuard, RolesGuard (globais)
│   ├── decorators/     # @Roles(), @Public(), @CurrentUser()
│   ├── filters/        # AllExceptionsFilter (resposta padrão)
│   ├── interceptors/   # LoggingInterceptor (Winston)
│   ├── storage/        # StorageService (R2/S3 + local)
│   ├── mail/           # MailService (MailerSend) + templates
│   ├── cache/          # VersionedCacheService (Redis, version-key)
│   └── utils/          # hash (bcrypt), image (sharp), zip, spreadsheet
├── config/             # ConfigModule + validação de env
├── app.module.ts
└── main.ts
```

## Status da migração

| Fase | Item | Status |
|------|------|--------|
| 0 | Fundação (Prisma schema, shared/, auth global, Docker, Swagger) | ✅ |
| 1 | Módulo **Auth** (login dual User/UserCliente, refresh com rotação, logout, reset de senha) | ✅ |
| 1 | Módulo **Users** (listagem com créditos, consultores, dados do usuário, CRUD, cliente-completo, feature-flags) | ✅ |
| 1 | Módulo **Remessas** (solicitação com planilha+ZIP+consumo de créditos, tarefas com cache versionado, status, downloads ZIP/planilha, responsabilidade, uploads) | ✅ |
| 2+ | Demais módulos (credit-sales, liberações, modelos-técnicos, endereços, entregas, dashboard, activity-log, roles, tecnologias, products, usuarios-cliente, atendimentos) | ⏳ |

## Setup

```bash
cp .env.example .env      # preencha JWT_SECRET, DATABASE_URL, R2, MAILERSEND...
npm install
npm run prisma:generate   # gera o Prisma Client
npm run prisma:migrate     # cria o schema no banco (dev)
npm run start:dev
```

Ou via Docker (app + MariaDB + Redis):

```bash
docker compose up --build
```

- API: `http://localhost:3000/apiparcelas`
- Swagger: `http://localhost:3000/apiparcelas/docs`
- Health: `GET http://localhost:3000/apiparcelas/testar_conexao`

## Notas de fidelidade / correções

- **IDs**: `BIGINT UNSIGNED` (Prisma `BigInt`), serializados como número no JSON (patch em `main.ts`) para bater com os ids numéricos do Laravel.
- **Resposta padrão**: `{ code, status, message, data, pagination }` (espelha os `*ResponseHelper`).
- **Correções documentadas** (decisão do projeto): `role_user` ganhou `id` sintético; endpoints de reset/criação mantêm o comportamento original (HTTP 200 com `code` no corpo em validação).
- **Cache**: version-key em Redis (substitui o driver `database`).
