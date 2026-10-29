/**
 * Entradas do ZIP que não são fotos: diretórios, metadados do macOS (`__MACOSX`, `._*`)
 * e `.DS_Store`. Aceita separador `\` de ZIPs gerados no Windows.
 */
export function deveIgnorarEntradaDoZip(nome: string): boolean {
  const caminho = nome.replace(/\\/g, '/');
  if (caminho.endsWith('/')) return true;
  if (caminho.includes('__MACOSX')) return true;
  const nomeArquivo = caminho.split('/').pop() ?? caminho;
  return nomeArquivo === '.DS_Store' || nomeArquivo.startsWith('._');
}
