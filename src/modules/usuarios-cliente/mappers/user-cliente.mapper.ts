import { UserCliente } from '@prisma/client';

/**
 * Espelha o UsuariosClientesResponseHelper::mapModelo. Correção documentada:
 * expõe `cliente_id` (coluna real) — o Laravel lia `user_id`, que não existe.
 */
export function mapUserCliente(modelo: UserCliente) {
  return {
    id: modelo.id,
    cliente_id: modelo.clienteId,
    email: modelo.email,
    nome: modelo.nome,
    ativo: modelo.ativo,
    created_at: modelo.createdAt,
    updated_at: modelo.updatedAt,
  };
}
