import { RemessaSituacao } from '@prisma/client';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/**
 * Converte a situação recebida para a chave do enum Prisma.
 * Aceita tanto a chave (`pronto_para_imprimir`) quanto o valor gravado no banco
 * (`pronto para imprimir`), que é o formato legado usado pelo front.
 */
export function converterSituacaoParaEnum(situacao: string): RemessaSituacao {
  const chave = String(situacao).trim().replace(/\s+/g, '_');
  if (chave in RemessaSituacao) return chave as RemessaSituacao;
  throw new BusinessException(`Situação da remessa inválida: ${situacao}.`);
}
