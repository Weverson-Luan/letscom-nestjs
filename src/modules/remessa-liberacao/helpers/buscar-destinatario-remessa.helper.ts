type SolicitanteComEmail = { email: string | null; nome: string | null } | null | undefined;

export type RemessaComSolicitantes = {
  userIdSolicitanteRemessa: bigint | null;
  usersSolicitanteSubordinadoId: bigint | null;
  solicitante?: SolicitanteComEmail;
  solicitanteSubordinado?: SolicitanteComEmail;
};

export type DestinatarioRemessa = { email: string; nome: string };

/**
 * O subordinado do portal é quem de fato solicitou: quando a remessa vem do portal,
 * user_id_solicitante_remessa também é preenchido com o titular do cadastro.
 * Mesma prioridade do RemessasResponseMapper.
 */
export function buscarDestinatarioPriorizandoSubordinado(
  remessa: RemessaComSolicitantes,
): DestinatarioRemessa | null {
  if (remessa.usersSolicitanteSubordinadoId && remessa.solicitanteSubordinado?.email) {
    return {
      email: remessa.solicitanteSubordinado.email,
      nome: remessa.solicitanteSubordinado.nome ?? 'Solicitante',
    };
  }

  if (remessa.userIdSolicitanteRemessa && remessa.solicitante?.email) {
    return {
      email: remessa.solicitante.email,
      nome: remessa.solicitante.nome ?? 'Solicitante',
    };
  }

  return null;
}

/**
 * Liberação de balcão: o e-mail vai para user_id_solicitante_remessa (tabela users).
 * Quando não houver solicitante com e-mail lá, usa o subordinado do cliente
 * (users_solicitante_subordinado_id → tabela users_cliente).
 */
export function buscarDestinatarioPriorizandoSolicitante(
  remessa: RemessaComSolicitantes,
): DestinatarioRemessa | null {
  if (remessa.userIdSolicitanteRemessa && remessa.solicitante?.email) {
    return {
      email: remessa.solicitante.email,
      nome: remessa.solicitante.nome ?? 'Solicitante',
    };
  }

  if (remessa.usersSolicitanteSubordinadoId && remessa.solicitanteSubordinado?.email) {
    return {
      email: remessa.solicitanteSubordinado.email,
      nome: remessa.solicitanteSubordinado.nome ?? 'Solicitante',
    };
  }

  return null;
}
