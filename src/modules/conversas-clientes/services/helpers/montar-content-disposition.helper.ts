/**
 * `Content-Disposition: attachment` com fallback ASCII e `filename*` (RFC 5987)
 * para nomes com acento. Remove aspas/quebras de linha que quebrariam o header.
 */
export function montarContentDisposition(nomeArquivo: string): string {
  const seguro = nomeArquivo.replace(/[\r\n"\\]/g, '_');
  const ascii = seguro.normalize('NFD').replace(/[^\x20-\x7E]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(seguro)}`;
}
