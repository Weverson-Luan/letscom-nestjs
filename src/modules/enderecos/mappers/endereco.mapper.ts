import { Endereco, User } from '@prisma/client';

type EnderecoWithUser = Endereco & { user?: User | null };

/** Espelha EnderecoResponseHelper::mapEnderecos. */
export function mapEndereco(endereco: EnderecoWithUser) {
  return {
    id: endereco.id,
    user_id: endereco.userId,
    logradouro: endereco.logradouro,
    numero: endereco.numero,
    complemento: endereco.complemento,
    bairro: endereco.bairro,
    cidade: endereco.cidade,
    estado: endereco.estado,
    cep: endereco.cep,
    ativo: endereco.ativo,
    tipo_endereco: endereco.tipoEndereco,
    nome_responsavel: endereco.nomeResponsavel,
    email: endereco.email,
    setor: endereco.setor,
    telefone: endereco.telefone,
    user: endereco.user
      ? {
          id: endereco.user.id,
          nome: endereco.user.nome,
          email: endereco.user.email,
        }
      : undefined,
    created_at: endereco.createdAt,
    updated_at: endereco.updatedAt,
    deleted_at: null,
  };
}
