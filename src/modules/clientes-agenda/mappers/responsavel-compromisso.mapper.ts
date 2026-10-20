import { ResponsavelCompromisso } from '../repositories/responsavel-compromisso.repository';

/** Subordinado pode não ter nome cadastrado: cai para o e-mail. */
export function mapearResponsavelCompromisso(responsavel: ResponsavelCompromisso) {
  return {
    tipo: responsavel.tipo,
    id: responsavel.id,
    nome: responsavel.nome?.trim() || responsavel.email,
    email: responsavel.email,
    documento: responsavel.documento,
  };
}
