/**
 * IMPORTS
 */
import { UserAtendimento } from '@prisma/client';

type UsuarioDono = { id: bigint; nome: string; email: string };

/**
 * Contrato do Laravel: mantém `user_id` e `user` (o front depende desses nomes).
 * `user` é montado campo a campo para nunca expor senha/documento do dono, mesmo que a
 * consulta traga a linha inteira.
 */
export function mapearUsuarioAtendimento(
  usuarioAtendimento: UserAtendimento & { user?: UsuarioDono | null },
) {
  const dono = usuarioAtendimento.user;
  return {
    id: usuarioAtendimento.id,
    user_id: usuarioAtendimento.userId,
    nome: usuarioAtendimento.nome,
    email: usuarioAtendimento.email,
    telefone: usuarioAtendimento.telefone,
    documento: usuarioAtendimento.documento,
    ativo: usuarioAtendimento.ativo,
    user: dono ? { id: dono.id, nome: dono.nome, email: dono.email } : undefined,
    created_at: usuarioAtendimento.createdAt,
    updated_at: usuarioAtendimento.updatedAt,
  };
}
