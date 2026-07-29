import { Tecnologia } from '@prisma/client';

/** Espelha o TecnologiasResponseHelper::mapTecnologia. */
export function mapTecnologia(tecnologia: Tecnologia) {
  return {
    id: tecnologia.id,
    nome: tecnologia.nome,
    descricao: tecnologia.descricao,
    ativo: tecnologia.ativo,
    created_at: tecnologia.createdAt,
    updated_at: tecnologia.updatedAt,
    deleted_at: null,
  };
}
