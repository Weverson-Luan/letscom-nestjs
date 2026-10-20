import {
  ArquivoAnexo,
  EXTENSOES_ANEXO_PERMITIDAS,
  MAXIMO_ANEXOS_POR_COMPROMISSO,
  TAMANHO_MAXIMO_ANEXO_BYTES,
} from '../../clientes-agenda.constants';
import { AnexoCompromissoInvalidoException } from '../../exceptions/anexo-compromisso-invalido.exception';

/**
 * O multer 2 (busboy) lê o nome do arquivo do multipart como latin1, então "orçamento.pdf"
 * enviado em UTF-8 chega como "orÃ§amento.pdf". Reinterpreta os bytes como UTF-8; se o
 * resultado não for UTF-8 válido, mantém o nome como veio.
 */
export function corrigirNomeArquivo(nome: string): string {
  const convertido = Buffer.from(nome, 'latin1').toString('utf8');
  return convertido.includes('\uFFFD') ? nome : convertido;
}

/** Anexos com o nome original corrigido (ver `corrigirNomeArquivo`). */
export function normalizarNomesAnexos(arquivos: ArquivoAnexo[]): ArquivoAnexo[] {
  return arquivos.map((arquivo) => ({
    ...arquivo,
    originalname: corrigirNomeArquivo(arquivo.originalname),
  }));
}

/** Extensão em minúsculas, ou '' quando o nome não tem extensão. */
export function extrairExtensao(nomeArquivo: string): string {
  const partes = nomeArquivo.split('.');
  return partes.length > 1 ? (partes.pop() ?? '').toLowerCase() : '';
}

/** Lança AnexoCompromissoInvalidoException na primeira regra violada. */
export function validarAnexosCompromisso(arquivos: ArquivoAnexo[]): void {
  if (arquivos.length > MAXIMO_ANEXOS_POR_COMPROMISSO) {
    throw new AnexoCompromissoInvalidoException(
      `Envie no máximo ${MAXIMO_ANEXOS_POR_COMPROMISSO} arquivos por compromisso.`,
    );
  }

  for (const arquivo of arquivos) {
    const tamanho = arquivo.size ?? arquivo.buffer.length;
    if (tamanho === 0) {
      throw new AnexoCompromissoInvalidoException(`O arquivo ${arquivo.originalname} está vazio.`);
    }
    if (tamanho > TAMANHO_MAXIMO_ANEXO_BYTES) {
      throw new AnexoCompromissoInvalidoException(
        `O arquivo ${arquivo.originalname} excede o limite de 10 MB.`,
      );
    }
    const extensao = extrairExtensao(arquivo.originalname);
    if (!(EXTENSOES_ANEXO_PERMITIDAS as readonly string[]).includes(extensao)) {
      throw new AnexoCompromissoInvalidoException(
        `Tipo de arquivo não permitido: ${arquivo.originalname}.`,
      );
    }
  }
}

/** Caminho no storage com nome aleatório (o nome original fica só no banco). */
export function montarCaminhoAnexoCompromisso(
  clienteId: bigint,
  nomeArquivo: string,
  uuid: string,
): string {
  return `clientes/${clienteId}/agenda/compromissos/${uuid}.${extrairExtensao(nomeArquivo)}`;
}
