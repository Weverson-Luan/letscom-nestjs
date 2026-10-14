// Carga em POST /remessas COM planilha CSV (multipart): além da transação do cenário sem planilha,
// mede o upload, a leitura da planilha no processo da API (CPU), a validação das colunas obrigatórias
// do modelo, a gravação do arquivo no storage e o registro em remessa_planilhas.
// Rode só em banco descartável: cada remessa fica no banco (observacao 'carga-k6') e o CSV fica no
// storage (storage/app/remessas/<id>/ em dev). Limpeza na doc.
// Variáveis do cenário: ver helpers/remessa.js. Além delas:
//   LINHAS          linhas por planilha = créditos gastos por remessa (default 20)
//   K6_CAMPO_CHAVE  coluna-chave; default = campo_chave do modelo técnico
//
//   npm run carga:solicitar-remessa-planilha
//   npm run carga:solicitar-remessa-planilha -- -e PERFIL=carga -e LINHAS=100
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, montarOpcoes } from './helpers/configuracao.js';
import {
  conferirSaldoFinal,
  montarCorpoBase,
  prepararCenario,
  solicitarRemessa,
} from './helpers/remessa.js';

export const options = montarOpcoes({ p95Ms: 2000 });

// total_solicitacoes precisa bater com as linhas da planilha: cada linha gasta 1 crédito
const LINHAS = parseInt(__ENV.LINHAS || '20', 10);
if (!Number.isInteger(LINHAS) || LINHAS < 1) {
  throw new Error(`LINHAS deve ser inteiro >= 1 (recebido: ${__ENV.LINHAS})`);
}

/** Lê o modelo pela API para montar uma planilha que a validação aceite. */
function buscarColunasDoModelo(cenario) {
  const resposta = http.get(`${BASE_URL}/modelo-tecnico/${cenario.modeloTecnicoId}`, {
    headers: { Authorization: `Bearer ${cenario.token}` },
    tags: { name: 'GET /modelo-tecnico/:id' },
  });
  if (resposta.status !== 200) {
    throw new Error(`Consulta do modelo falhou (${resposta.status}): ${resposta.body}`);
  }

  const modelo = resposta.json('data');
  if (!modelo.ativo) {
    throw new Error(`Modelo ${cenario.modeloTecnicoId} está inativo; use um modelo ativo.`);
  }
  if (modelo.tem_carga_foto) {
    throw new Error(
      `Modelo ${cenario.modeloTecnicoId} exige ZIP de fotos; use um modelo com tem_carga_foto = 0.`,
    );
  }

  const campoChave = String(__ENV.K6_CAMPO_CHAVE || modelo.campo_chave || '')
    .trim()
    .toLowerCase();
  if (!campoChave) {
    throw new Error(`Modelo ${cenario.modeloTecnicoId} sem campo_chave; informe K6_CAMPO_CHAVE.`);
  }

  // a API lê os cabeçalhos em minúsculas; preenche todos os campos variáveis, obrigatórios ou não
  const variaveis = (modelo.campos_variaveis || []).map((c) => String(c.nome).trim().toLowerCase());
  const colunas = [...new Set([campoChave, 'nome', ...variaveis])].filter((c) => c !== '');

  console.log(`Planilha: ${LINHAS} linhas, colunas ${colunas.join(', ')} (chave: ${campoChave})`);
  return { campoChave, colunas };
}

/** CSV com chaves únicas por VU/iteração; os valores não têm vírgula nem aspas. */
function montarCsv(colunas, campoChave) {
  const linhas = [colunas.join(',')];
  for (let i = 1; i <= LINHAS; i++) {
    const chave = `k6${__VU}x${__ITER}x${i}`;
    linhas.push(
      colunas
        .map((coluna) => {
          if (coluna === campoChave) return chave;
          if (coluna === 'nome') return `Pessoa Carga ${i}`;
          return `${coluna} ${i}`;
        })
        .join(','),
    );
  }
  return linhas.join('\n');
}

/** Roda 1 vez: login, IDs, saldo inicial e colunas do modelo. */
export function setup() {
  const cenario = prepararCenario(LINHAS);
  return { ...cenario, ...buscarColunasDoModelo(cenario) };
}

export default function (cenario) {
  const csv = montarCsv(cenario.colunas, cenario.campoChave);
  // com http.file o k6 envia multipart/form-data, como o front
  solicitarRemessa(cenario, {
    ...montarCorpoBase(cenario, LINHAS),
    campo_chave: cenario.campoChave,
    csv_file: http.file(csv, 'planilha-carga-k6.csv', 'text/csv'),
  });
  sleep(1);
}

export function teardown(cenario) {
  conferirSaldoFinal(cenario, LINHAS);
}
