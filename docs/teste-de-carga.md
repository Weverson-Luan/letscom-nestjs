# Teste de carga com k6

Guia para medir como a API se comporta com muitos usuários ao mesmo tempo.
Testes unitários e e2e estão em [testes.md](testes.md).

## Resumo rápido

```bash
brew install k6                      # uma vez
npm run docker:up                    # API de dev no ar (http://localhost:8000)
npm run carga:conexao                # teste de fumaça: 1 usuário, 10 requisições
npm run carga:conexao -- -e PERFIL=carga
```

---

## 1. O que é

**Teste de carga** simula vários usuários usando a API ao mesmo tempo e mede o que acontece:
tempo de resposta, quantas requisições por segundo ela aguenta e a partir de quando começa a dar erro.

**k6** ([k6.io](https://k6.io), da Grafana Labs) é a ferramenta que gera essa carga. Os testes são
scripts em JavaScript; o k6 executa cada script com N **usuários virtuais (VUs)**, cada um repetindo
a função `default` em loop, e no fim mostra um resumo com as métricas.

| Conceito | O que significa |
|---|---|
| **VU** (virtual user) | um "usuário" simulado; cada VU roda o script em loop |
| **iteração** | uma execução completa da função `default` por um VU |
| **stages** | rampa de VUs ao longo do tempo (ex.: sobe para 20 em 1 min, mantém 3 min, desce) |
| **check** | verificação de uma resposta (`status 200`, corpo esperado). Não para o teste; vira a métrica `checks` |
| **threshold** | critério de aprovação (ex.: p95 < 500 ms). Se estourar, o k6 termina com erro (exit code ≠ 0) |
| **p95** | 95% das requisições responderam abaixo desse tempo. Mais confiável que a média |

## 2. Por que usar

- **Descobrir o limite antes do cliente.** Quantos usuários simultâneos a API aguenta antes de ficar lenta ou cair.
- **Comparar antes e depois.** Rodar o mesmo script antes e depois de uma mudança (índice no banco, cache,
  refatoração de query) e ver se o p95 melhorou ou piorou.
- **Validar a migração do Laravel.** Mesmo cenário nas duas APIs, mesmos números para comparar.
- **Achar gargalos que só aparecem com concorrência.** Pool de conexões do Prisma esgotado, lock no MySQL,
  Redis lento, vazamento de memória.
- **Proteger com regras.** Os thresholds transformam "está rápido" em critério objetivo, que pode rodar em CI.

## 3. Como usar — passo a passo

### 3.1 Instalar o k6 (uma vez)

```bash
brew install k6        # macOS
k6 version             # confere a instalação
```

Sem instalar nada, dá para rodar pela imagem Docker oficial (ver [3.5](#35-rodar-sem-instalar-via-docker)).

### 3.2 Subir a API alvo

Os scripts apontam por padrão para a API de dev (`http://localhost:8000/apiparcelas`):

```bash
npm run docker:up
curl http://localhost:8000/apiparcelas/testar_conexao   # deve responder 200
```

Para outro ambiente (homologação), passe `-e BASE_URL=https://.../apiparcelas`.
**Nunca rode contra produção**: o teste gera carga real e pode derrubar o serviço.

### 3.3 Começar sempre pela fumaça

O perfil padrão é `fumaca` (1 VU, 10 iterações). Ele só confirma que o script, a URL e o login funcionam:

```bash
npm run carga:conexao
```

Se a fumaça passar (todos os checks ✓), suba o perfil.

### 3.4 Escolher o perfil

O perfil é escolhido com `-e PERFIL=...` e fica em [`test/carga/helpers/configuracao.js`](../test/carga/helpers/configuracao.js):

| Perfil | Carga | Duração | Pergunta que responde |
|---|---|---|---|
| `fumaca` | 1 VU, 10 iterações | segundos | o script funciona? |
| `carga` | sobe até 20 VUs e mantém | 5 min | a API aguenta o uso normal com folga? |
| `estresse` | degraus de 50 → 100 → 200 VUs | 9 min | a partir de quantos usuários degrada? |
| `pico` | salta de 5 para 300 VUs em 20 s | ~2 min | aguenta um pico repentino e se recupera? |

Ajuste os números nesse arquivo conforme o uso real do sistema.

### 3.5 Rodar sem instalar (via Docker)

```bash
docker run --rm -i \
  -v "$PWD/test/carga:/scripts" \
  -e BASE_URL=http://host.docker.internal:8000/apiparcelas \
  -e PERFIL=carga \
  grafana/k6 run /scripts/testar-conexao.js
```

`host.docker.internal` é como o container enxerga o `localhost` do Mac.

## 4. Scripts disponíveis

Ficam em [`test/carga/`](../test/carga/):

| Script npm | Arquivo | Rota | O que mede |
|---|---|---|---|
| `carga:conexao` | `testar-conexao.js` | `GET /testar_conexao` (pública) | base da API: Nest + Prisma + MySQL, sem regra de negócio |
| `carga:remessas` | `listar-tarefas-disponiveis.js` | `GET /remessas/tarefas-disponiveis` (autenticada) | JWT + papel + feature flag + listagem paginada com cache no Redis |
| `carga:solicitar-remessa` | `solicitar-remessa-sem-planilha.js` | `POST /remessas` sem arquivos (autenticada, **grava**) | só a transação: saldo, remessa, consumo de crédito, status, invalidação de cache |
| `carga:solicitar-remessa-planilha` | `solicitar-remessa-com-planilha.js` | `POST /remessas` multipart com CSV (autenticada, **grava**) | transação + upload, leitura da planilha (CPU na API), validação de colunas e gravação no storage |

O `carga:remessas` precisa de um usuário de dev com papel `admin` ou `producao`: a rota aceita também
`consultor`, mas o seed só libera a feature `pegar_tarefa_remessas` para `admin,producao`. Com o banco
populado pelo seed (`prisma/seed.ts`), use `admin@example.com` / `admin123`. O login é feito **uma vez** no `setup()`, porque o `POST /login` aceita
só 30 requisições por minuto.

As credenciais vêm de `K6_EMAIL` e `K6_SENHA`, de um destes lugares:

- **no `.env`** (recomendado, para não digitar sempre; o `.env` não é versionado):
  ```
  K6_EMAIL=admin@example.com
  K6_SENHA=admin123
  ```
- **no comando**, que tem prioridade sobre o `.env`: `-- -e K6_EMAIL=... -e K6_SENHA=...`

Sem elas, o teste para logo no início com `Informe K6_EMAIL e K6_SENHA`.

### 4.1 Solicitação de remessas (`carga:solicitar-remessa` e `carga:solicitar-remessa-planilha`)

Rota de **escrita**: cada requisição cria uma remessa e consome créditos. Rode só em banco de dev/descartável.

São dois cenários, porque exercitam partes diferentes da API:

| Cenário | Body | Créditos por remessa | Gargalo que procura |
|---|---|---|---|
| **sem planilha** | só campos | 1 | transação no MySQL (saldo, `numero_remessa`, locks) |
| **com planilha** | multipart com CSV de `LINHAS` linhas (default 20) | `LINHAS` | o anterior + upload, leitura do CSV no processo da API, storage |

O com planilha consulta o modelo (`GET /modelo-tecnico/:id`) no `setup()` e monta o CSV com a coluna-chave
(`campo_chave` do modelo, ou `K6_CAMPO_CHAVE`), `nome` e todos os campos variáveis, com chaves únicas por linha.
Ele para logo no início se o modelo exigir ZIP de fotos.

Os dois marcam as remessas com `observacao='carga-k6'` para facilitar a limpeza. No `setup()` consultam o saldo e
param se não cobrir uma remessa; no `teardown()` consultam de novo e conferem que o saldo **não ficou negativo**.
As partes comuns ficam em [`test/carga/helpers/remessa.js`](../test/carga/helpers/remessa.js).

**1. Descubra os IDs** (consulta só de leitura, no banco de dev):

```sql
SELECT id AS cliente_id FROM users WHERE email = 'admin@example.com';
SELECT id AS produto_id, nome FROM produtos WHERE ativo = 1;
SELECT id AS modelo_tecnico_id, nome_modelo FROM modelos_tecnicos WHERE ativo = 1 AND tem_carga_foto = 0;
SELECT id AS tecnologia_id, nome FROM tecnologias;
```

**2. Coloque no `.env`** (além de `K6_EMAIL`/`K6_SENHA` de um admin):

```
K6_CLIENTE_ID=...
K6_PRODUTO_ID=...
K6_MODELO_TECNICO_ID=...
K6_TECNOLOGIA_ID=...
# K6_SOLICITANTE_ID=...   opcional; default = K6_CLIENTE_ID
```

**3. Garanta créditos.** O seed dá só 15 créditos ao `admin@example.com`. Estimativa de remessas por perfil
(cada VU faz ~1 requisição/s) e de créditos gastos:

| Perfil | Remessas (aprox.) | Créditos sem planilha | Créditos com planilha (`LINHAS=20`) |
|---|---|---|---|
| `fumaca` | 10 | 10 | 200 |
| `carga` | ~4.800 | ~4.800 | ~96.000 |
| `estresse` | ~47.000 | ~47.000 | ~940.000 |
| `pico` | ~25.000 | ~25.000 | ~500.000 |

No com planilha, créditos = remessas × `LINHAS`; baixe `LINHAS` para economizar ou suba para planilhas maiores.

Lance créditos pela própria API (como admin), com folga:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/apiparcelas/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","senha":"admin123"}' | jq -r .access_token)
curl -X POST http://localhost:8000/apiparcelas/vendas_creditos -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"cliente_id":<CLIENTE_ID>,"produto_id":<PRODUTO_ID>,"quantidade_creditos":10000,"tipo_transacao":"entrada","status":"confirmado","observacao":"carga-k6"}'
```

Sem saldo, as requisições voltam `422 Saldo insuficiente` e aparecem na métrica `remessas_recusadas_422`.

**4. Rode** (sempre fumaça primeiro):

```bash
npm run carga:solicitar-remessa
npm run carga:solicitar-remessa -- -e PERFIL=carga

npm run carga:solicitar-remessa-planilha
npm run carga:solicitar-remessa-planilha -- -e PERFIL=carga -e LINHAS=100
```

Se a resposta não for 201, o script imprime o corpo da primeira falha de cada VU
(`POST /remessas respondeu 422: ...`), com o motivo.

**5. O que olhar, além das métricas padrão:**

| Métrica / log | Significado |
|---|---|
| `remessas_criadas` | remessas gravadas (201) |
| `remessas_recusadas_422` | regra de negócio recusou: saldo esgotado, modelo com foto, coluna obrigatória vazia (veja o log `POST /remessas respondeu`) |
| `remessas_erro_interno_500` | falhou dentro da transação. Com concorrência, a causa provável é colisão no `numero_remessa` (gerado com `MAX + 1`, coluna `UNIQUE`) ou deadlock/timeout no MySQL — confira `npm run docker:errors` |
| log `Saldo final ... consumido` | o número de remessas do log (consumido ÷ créditos por remessa: 1 no sem planilha, `LINHAS` no com planilha) deve ser igual a `remessas_criadas`; se for maior, ou o check `saldo não ficou negativo` falhar, há corrida na checagem de saldo (vendas com soft delete no cliente também causam diferença: o endpoint de saldo as ignora, a transação não) |

**6. Limpe depois.** Se rodou o com planilha, apague primeiro os arquivos: em dev o storage é local e o CSV fica em
`storage/app/remessas/<id>/` (pasta fora do git). Liste os IDs **antes** do SQL abaixo e apague
as pastas, na raiz do repositório (o container do banco já tem usuário, senha e banco nas variáveis `MYSQL_*`):

```bash
docker exec letscom-bd-dev sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" -N -e "SELECT id FROM remessas WHERE observacao = \"carga-k6\""' > ids.txt
xargs -I{} rm -rf storage/app/remessas/{} < ids.txt && rm ids.txt
```

Depois, execute no banco de dev (apaga só o que o teste criou; o extrato tem FK `RESTRICT`, por isso a ordem;
`remessas_status` e `remessa_planilhas` vão em cascata):

```sql
START TRANSACTION;
CREATE TEMPORARY TABLE carga_remessas AS SELECT id FROM remessas WHERE observacao = 'carga-k6';
CREATE TEMPORARY TABLE carga_vendas AS
  SELECT venda_credito_id AS id FROM extrato_movimentacoes_creditos_cliente
  WHERE remessa_id IN (SELECT id FROM carga_remessas) AND venda_credito_id IS NOT NULL;
DELETE FROM extrato_movimentacoes_creditos_cliente WHERE remessa_id IN (SELECT id FROM carga_remessas);
DELETE FROM vendas_creditos WHERE id IN (SELECT id FROM carga_vendas);
DELETE FROM remessas WHERE id IN (SELECT id FROM carga_remessas);
-- ciência de responsabilidade usada pelo script (ligada ao cliente, não à remessa)
DELETE FROM remessa_responsabilidade WHERE cliente_id = <CLIENTE_ID> AND documento = '00000000000';
COMMIT;
DROP TEMPORARY TABLE carga_remessas, carga_vendas;
```

A venda de entrada `observacao='carga-k6'` (créditos lançados no passo 3) pode ser cancelada pela API
(`POST /vendas_creditos/:id/cancelar`) ou mantida para o próximo teste.

## 5. Exemplos para executar

```bash
# fumaça (padrão)
npm run carga:conexao
npm run carga:remessas                                    # K6_EMAIL/K6_SENHA do .env
npm run carga:remessas -- -e K6_EMAIL=admin@example.com -e K6_SENHA=admin123

# carga normal, estresse e pico
npm run carga:conexao -- -e PERFIL=carga
npm run carga:conexao -- -e PERFIL=estresse
npm run carga:remessas -- -e PERFIL=pico
npm run carga:solicitar-remessa -- -e PERFIL=carga        # grava no banco: ver seção 4.1
npm run carga:solicitar-remessa-planilha -- -e LINHAS=50  # grava no banco e no storage

# outro ambiente
npm run carga:conexao -- -e BASE_URL=https://homolog.exemplo.com/apiparcelas -e PERFIL=carga

# carga customizada, sem perfil: 50 VUs por 2 minutos (as flags --vus/--duration sobrescrevem o perfil)
npm run carga:conexao -- --vus 50 --duration 2m

# salvar o resumo em JSON (para comparar antes/depois)
mkdir -p test/carga/resultados
npm run carga:conexao -- -e PERFIL=carga --summary-export test/carga/resultados/conexao-carga.json

# painel ao vivo no navegador (http://localhost:5665) + relatório HTML ao final
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=test/carga/resultados/relatorio.html \
  npm run carga:conexao -- -e PERFIL=carga
```

A pasta `test/carga/resultados/` está no `.gitignore`.

## 6. Como ler o resultado

Ao final, o k6 imprime algo assim (trecho):

```
  ✓ http_req_duration..............: avg=42ms  med=38ms  p(90)=61ms  p(95)=75ms  max=310ms
  ✓ http_req_failed................: 0.00%  0 out of 1200
  ✓ checks.........................: 100.00% 2400 out of 2400
    http_reqs......................: 1200   19.8/s
    vus_max........................: 20
```

| Métrica | O que olhar |
|---|---|
| `http_req_duration` p(95) | principal indicador de lentidão. Compare com o threshold do script |
| `http_req_failed` | % de respostas com erro (status ≥ 400 ou falha de rede). Deve ficar perto de 0 |
| `checks` | % das verificações que passaram. Abaixo de 100%: a API respondeu, mas errado |
| `http_reqs` (/s) | vazão: requisições por segundo que a API sustentou |
| ✓ / ✗ na frente | threshold aprovado / reprovado. Qualquer ✗ faz o k6 sair com erro |

Enquanto o teste roda, acompanhe a API em outro terminal: `npm run docker:status` (CPU/RAM) e
`npm run docker:errors` (erros no log).

## 7. Escrevendo um novo script

Arquivo em `test/carga/<acao>-<recurso>.js`, reaproveitando os helpers:

```js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { autenticar } from './helpers/autenticar.js';
import { BASE_URL, montarOpcoes } from './helpers/configuracao.js';

// perfil vem do -e PERFIL; p95Ms é o tempo máximo aceito para 95% das respostas
export const options = montarOpcoes({ p95Ms: 500 });

// roda 1 vez: login aqui, nunca dentro do default
export function setup() {
  return { token: autenticar() };
}

// roda em loop, por VU
export default function ({ token }) {
  const resposta = http.get(`${BASE_URL}/minha-rota`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(resposta, { 'status 200': (r) => r.status === 200 });
  sleep(1); // pausa entre ações, como um usuário real
}
```

Depois, adicione o script npm no `package.json` (`"carga:<recurso>": "k6 run test/carga/<arquivo>.js"`)
e uma linha na tabela da [seção 4](#4-scripts-disponíveis).

## 8. Cuidados

- **Nunca contra produção.** Use dev, homologação ou um ambiente dedicado.
- **Prefira rotas de leitura.** Rotas que gravam (criar cliente, solicitar remessa) enchem o banco de dados
  de teste; se precisar delas, use um banco descartável e limpe depois (a limpeza do `carga:solicitar-remessa`
  está na [seção 4.1](#41-solicitação-de-remessas-cargasolicitar-remessa-e-cargasolicitar-remessa-planilha)).
- **Cache do Redis.** As listagens de remessas ficam em cache por `REMESSAS_CACHE_TTL` segundos. Repetir
  sempre a mesma URL mede o Redis, não o MySQL. Por isso o script varia a página.
- **Rodar do mesmo lugar.** Para comparar antes e depois, use a mesma máquina, o mesmo perfil e o mesmo volume
  de dados no banco. O próprio k6 consome CPU: em testes pesados, rode-o fora da máquina da API.
- **Rate limit.** O `POST /login` aceita 30 requisições por minuto por IP. Testar o login em si exige
  ajustar o `@Throttle` no ambiente de teste.
