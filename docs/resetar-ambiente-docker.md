# Resetar ambiente Docker local (zerar e recriar)

Remove **containers, volumes (dados do MariaDB e Redis), rede e imagem da API** deste projeto, e depois recria tudo do zero.

> ⚠️ Apagar os volumes apaga **todo o banco local**. Se precisar dos dados, faça um dump antes.

## 1. Limpar tudo

Na raiz do projeto:

```bash
docker compose down -v --rmi local --remove-orphans
```

| Flag               | O que remove                                              |
|--------------------|-----------------------------------------------------------|
| `-v`               | Volumes `letscom-nestjs_letscom_nest_db_data` e `letscom-nestjs_letscom_nest_redis_data` |
| `--rmi local`      | Imagem construída da API (`letscom-nestjs-app_letscom`)   |
| `--remove-orphans` | Containers antigos de serviços que não estão mais no compose |

A rede `letscom-nestjs_letscom-net` e os containers `letscom_nest_app`, `letscom_nest_db` e `letscom_nest_redis` são removidos automaticamente.

### Conferir se ficou zerado

```bash
docker ps -a --filter name=letscom_nest
docker volume ls | grep letscom-nestjs
docker images | grep letscom-nestjs
docker network ls | grep letscom-nestjs
```

Nenhum comando deve retornar linhas.

> Não remova os volumes `backend-nest_*` e `letscom-backend_*` — são de outros projetos.

## 2. Recriar

### Opção A — só banco e Redis no Docker, API local (dev)

```bash
docker compose up -d letscom_db letscom_redis
docker compose ps        # aguarde letscom_nest_db ficar "healthy"
```

Popular o banco (escolha uma):

- **Dump Laravel:** siga [executar-dump-local-via-docker.md](./executar-dump-local-via-docker.md) (não rode `prisma migrate` depois).
- **Banco vazio via Prisma:**

  ```bash
  npm run prisma:migrate
  npm run prisma:seed
  ```

Subir a API:

```bash
npm run prisma:generate
npm run start:dev
```

`.env` local deve apontar para `127.0.0.1`:

```env
DATABASE_URL="mysql://root:letscom2026%40@127.0.0.1:3306/letscom"
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Opção B — tudo no Docker (API inclusa)

```bash
docker compose up -d --build
docker compose logs -f app_letscom
```

Dentro do compose a API usa `letscom_db` e `letscom_redis` como host (já definido em `environment` do `docker-compose.yml`, sobrescrevendo o `.env`).

API em `http://localhost:3000`.
