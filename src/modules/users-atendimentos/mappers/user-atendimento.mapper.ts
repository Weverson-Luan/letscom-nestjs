import { UserAtendimento } from '@prisma/client';

export function mapUserAtendimento(
  item: UserAtendimento & { user?: { id: bigint; nome: string; email: string } | null },
) {
  return {
    id: item.id,
    user_id: item.userId,
    nome: item.nome,
    email: item.email,
    telefone: item.telefone,
    documento: item.documento,
    ativo: item.ativo,
    user: item.user ?? undefined,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}
