# Importar dump Laravel no MariaDB local (Docker)

```bash
docker compose up -d letscom_db

docker exec -i letscom_nest_db \
  mariadb \
  -u root \
  -p'letscom2026@' \
  letscom < ~/Downloads/backup-diario_mysql-20260902-030149.sql
```

O NestJS é compatível com o dump Laravel **sem alterar o schema** e **sem rodar `prisma migrate`** depois do import. A tabela `role_user` do Laravel não tem coluna `id`; o acesso é feito via `RoleUserRepository` (SQL direto).

## Conexão DBeaver

| Campo    | Valor           |
|----------|-----------------|
| Host     | `127.0.0.1`     |
| Porta    | `3306`          |
| Database | `letscom`       |
| Usuário  | `root`          |
| Senha    | `letscom2026@`  |

`DATABASE_URL` no `.env` local:

```env
DATABASE_URL="mysql://root:letscom2026%40@127.0.0.1:3306/letscom"
```

## Subir a API local

```bash
docker compose up -d letscom_db letscom_redis
npm run start:dev
```

Login de teste (se existir no dump): `admin@letscom.com.br`
