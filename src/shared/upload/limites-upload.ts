/**
 * Limites de tamanho por tipo de upload (multer em memória).
 * Acima do limite o multer aborta o envio e o Nest responde 413 (Payload Too Large),
 * antes de o arquivo inteiro ocupar a memória do processo.
 */
const MEGABYTE = 1024 * 1024;

export const TAMANHO_MAXIMO_PLANILHA_BYTES = 20 * MEGABYTE;
export const TAMANHO_MAXIMO_ZIP_FOTOS_BYTES = 100 * MEGABYTE;
export const TAMANHO_MAXIMO_IMAGEM_BYTES = 10 * MEGABYTE;
export const TAMANHO_MAXIMO_COMPROVANTE_BYTES = 10 * MEGABYTE;

/** Teto do conteúdo descompactado de um ZIP (proteção contra zip bomb). */
export const TAMANHO_MAXIMO_ZIP_DESCOMPACTADO_BYTES = 300 * MEGABYTE;
export const QUANTIDADE_MAXIMA_ENTRADAS_ZIP = 2000;
