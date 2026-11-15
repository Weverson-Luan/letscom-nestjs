/**
 * IMPORTS
 */
import { ParsedSheet } from 'src/shared/utils/spreadsheet.service';

// helpers
import {
  resolverMatriculaNaPlanilha,
  sanitizarChaveMatricula,
} from './remessa-chave-matricula.helper';

export interface FotoItemRemessa {
  id: bigint;
  matricula: string | null;
  nome: string | null;
  filePath: string;
}

export interface ItemRemessaComPlanilha {
  /** linha da planilha (coluna -> valor) */
  dados: Record<string, string>;
  /** foto da linha, quando a remessa tem foto para ela */
  foto: FotoItemRemessa | null;
}

/**
 * Itens da remessa a partir da planilha: cada linha com algum dado vira um item.
 * Quando o campo chave existe na planilha, a linha recebe a foto de mesma matrícula.
 */
export function montarItensRemessa(
  planilha: ParsedSheet,
  fotos: FotoItemRemessa[],
  campoChave: string,
): { colunas: string[]; itens: ItemRemessaComPlanilha[] } {
  const chave = campoChave.trim().toLowerCase();
  const juntarFotos = chave !== '' && planilha.headers.includes(chave);

  const fotoPorMatricula: Record<string, FotoItemRemessa> = {};
  for (const foto of fotos) {
    if (!foto.filePath || !foto.matricula) continue;
    fotoPorMatricula[sanitizarChaveMatricula(foto.matricula)] = foto;
  }

  const itens: ItemRemessaComPlanilha[] = [];
  for (const linha of planilha.rows) {
    const temDados = planilha.headers.some((coluna) => String(linha[coluna] ?? '').trim() !== '');
    if (!temDados) continue;

    let foto: FotoItemRemessa | null = null;
    if (juntarFotos) {
      const matriculaFoto = resolverMatriculaNaPlanilha(
        fotoPorMatricula,
        String(linha[chave] ?? ''),
      );
      foto = matriculaFoto === null ? null : fotoPorMatricula[matriculaFoto];
    }

    itens.push({ dados: linha, foto });
  }

  const colunas = itens.length > 0 ? planilha.headers.filter((coluna) => coluna.trim() !== '') : [];
  return { colunas, itens };
}
