# Ambiente Docker (dev e produção)

Como o projeto roda no Docker, o que cada arquivo faz e os comandos do dia a dia.

## Visão geral

| Arquivo | Para que serve |
|---|---|
| `Dockerfile` | Um único Dockerfile com estágios para **dev** e **produção** |
| `docker-compose.dev.yml` | Desenvolvimento: código montado no container, com hot reload |
| `docker-compose.prod.yml` | Produção: imagem compilada e enxuta, sem acesso ao código da máquina |
| `scripts/docker-monitor.sh` | Painel de status e logs da API em dev |

Os dois composes sobem os mesmos três serviços:

| Serviço | Container (dev / prod) | Imagem |
|---|---|---|
| API NestJS | `letscom-api-dev` / `letscom-api` | build do `Dockerfile` |
| Banco MySQL | `letscom-bd-dev` / `letscom-bd` | `mysql:8.4` |
| Cache Redis | `letscom-redis-dev` / `letscom-redis` | `redis:7-alpine` |

A API só sobe depois que o banco e o Redis estiverem **healthy** (`depends_on` + healthcheck). Ao iniciar, ela roda `prisma migrate deploy`, que aplica as migrations pendentes automaticamente.

Dev e prod usam nomes de projeto diferentes (`letscom-dev` e `letscom-prod`). Por isso, cada um tem seu próprio banco, volumes e rede, e um não interfere no outro.

## Estágios do Dockerfile

```
base ──► development ──► builder
  │
  └────► production  (copia só dist/, prisma/ e node_modules de produção do builder)
```

| Estágio | O que faz |
|---|---|
| `base` | `node:22-bookworm-slim` + `openssl` (necessário para Prisma/sharp) |
| `development` | `npm ci` completo + `prisma generate`. Roda `migrate deploy` e `npm run start:dev` (watch) |
| `builder` | Parte do `development` e roda `npm run build` |
| `production` | Só dependências de produção, usuário `node` (não root). Roda `migrate deploy` e `node dist/main.js` |

O `prisma` fica em `dependencies` (não em `devDependencies`), porque a imagem de produção precisa do CLI para rodar as migrations.

## Variáveis de ambiente

Os composes leem o `.env` da raiz. Além das variáveis normais da aplicação, o Docker usa estas:

```env
APP_PORT=8000              # porta da API (host e container)

MYSQL_ROOT_PASSWORD=...    # senha do root do MySQL do container
MYSQL_USER=letscom
MYSQL_PASSWORD=...
MYSQL_DATABASE=letscom
MYSQL_PORT=3307            # porta do MySQL no host (só dev)

REDIS_PASSWORD=            # vazio = Redis sem senha
```

- Dentro do Docker, o `DATABASE_URL` e o `REDIS_HOST` do `.env` são **sobrescritos** pelo compose para apontar para os containers `mysql` e `redis`. O `DATABASE_URL` do `.env` só vale quando você roda a API fora do Docker.
- Se faltar alguma `MYSQL_*`, o compose para com a mensagem `defina MYSQL_... no .env`.
- Use senhas só com letras e números. Caracteres como `@`, `#` e `/` quebram o `DATABASE_URL`.

Modelo completo em `.env.example`.

## Desenvolvimento

### Subir

```bash
npm run docker:up
```

| O quê | Onde |
|---|---|
| Swagger | http://localhost:8000/apiparcelas/docs |
| MySQL (DBeaver etc.) | `localhost:3307`, usuário/senha do `.env` |
| Redis | só na rede interna do Docker |

### Hot reload: o que precisa (ou não) de rebuild

O código da sua máquina é montado dentro do container (`.:/app`) e a API roda em `nest start --watch`. Então, ao **salvar um arquivo, a API recompila e reinicia sozinha** em poucos segundos. Não precisa rebuildar.

| Situação | O que fazer |
|---|---|
| Editar código em `src/`, templates `.hbs` | Nada |
| Mudar o `.env` | `npm run docker:up` (recria o container) |
| Instalar/remover pacote (`package.json`) | `npm install` local **e** `npm run docker:rebuild` |
| Mudar `schema.prisma` / criar migration | `docker exec letscom-api-dev npx prisma generate` e `npm run docker:restart` |
| Mudar o `Dockerfile` | `npm run docker:rebuild` |

O `node_modules` do container fica num volume próprio (`app_node_modules`), separado do da sua máquina, porque os binários nativos (sharp, bcrypt, prisma) são compilados para Linux. Por isso, depois de instalar um pacote, rode o `docker:rebuild`: a flag `-V` recria esse volume.

### Monitorar

| Comando | O que faz |
|---|---|
| `npm run docker:status` | Painel: estado/saúde dos containers, se a API responde (HTTP) e uso de CPU/RAM |
| `npm run docker:logs` | Logs da API em tempo real |
| `npm run docker:errors` | Logs em tempo real filtrando `error`, `warn`, `exception`, `fail` |
| `npm run docker:monitor` | Painel de status e, em seguida, logs em tempo real |

`Ctrl+C` sai do monitoramento, e a API continua rodando.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run docker:down` | Para tudo (o banco é mantido no volume) |
| `npm run docker:restart` | Reinicia só a API (reaplica migrations pendentes) |
| `npm run docker:rebuild` | Rebuild da imagem + recria o volume de `node_modules` |
| `docker exec -it letscom-api-dev sh` | Abre um terminal dentro do container da API |
| `docker exec letscom-api-dev npm run prisma:seed` | Popula o banco com o seed |

## Produção

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app
```

Diferenças em relação ao dev:

- **Sem código montado.** A imagem roda o `dist/` compilado no build. Toda mudança exige `up -d --build`.
- **Banco não exposto.** O MySQL não publica porta no host, só a API acessa.
- **Dados persistentes.** Volumes `mysql_data`, `app_storage` (uploads locais em `storage/app`, quando `FILESYSTEM_DISK=local`) e `app_logs` (logs do winston).
- **Usuário não root.** A API roda como `node`.

## Zerar o ambiente

> ⚠️ `-v` apaga os volumes, ou seja, **todo o banco local**. Se precisar dos dados, faça um dump antes.

```bash
# dev
docker compose -f docker-compose.dev.yml down -v --rmi local --remove-orphans

# prod
docker compose -f docker-compose.prod.yml down -v --rmi local --remove-orphans
```

Depois é só subir de novo (`npm run docker:up`). As migrations recriam as tabelas vazias.

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| `required variable MYSQL_... is missing a value` | Falta a variável no `.env` |
| `port is already allocated` na 3307 ou 8000 | Outro processo usa a porta. Troque `MYSQL_PORT` / `APP_PORT` no `.env` |
| `Cannot find module '...'` após instalar pacote | Volume de `node_modules` desatualizado. Rode `npm run docker:rebuild` |
| API não recarrega ao salvar | Veja `npm run docker:logs`. Se nada aparecer, `npm run docker:restart` |
| `prisma generate` falha com `"url" is missing` | O `datasource db` do `schema.prisma` precisa de `url = env("DATABASE_URL")` |
