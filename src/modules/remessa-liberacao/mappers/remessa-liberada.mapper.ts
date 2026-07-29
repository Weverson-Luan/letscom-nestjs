import {
  RemessaLiberadaBalcao,
  RemessaLiberadaCliente,
  TipoEntrega,
  User,
} from '@prisma/client';

type BalcaoWithRels = RemessaLiberadaBalcao & {
  remessa?: unknown;
  executor?: User | null;
  tipoEntrega?: TipoEntrega | null;
};

type ClienteWithRels = RemessaLiberadaCliente & {
  remessa?: unknown;
  executor?: User | null;
  tipoEntrega?: TipoEntrega | null;
};

export function mapRemessaLiberadaBalcao(item: BalcaoWithRels) {
  return {
    id: item.id,
    remessa_id: item.remessaId,
    user_id_executor: item.userIdExecutor,
    tipo_entrega_id: item.tipoEntregaId,
    data_entrega: item.dataEntrega,
    observacao: item.observacao,
    outros: item.outros,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    remessa: item.remessa ?? undefined,
    executor: item.executor
      ? { id: item.executor.id, nome: item.executor.nome, email: item.executor.email }
      : undefined,
    tipo_entrega: item.tipoEntrega
      ? { id: item.tipoEntrega.id, tipo: item.tipoEntrega.tipo }
      : undefined,
  };
}

export function mapRemessaLiberadaCliente(item: ClienteWithRels) {
  return {
    id: item.id,
    remessa_id: item.remessaId,
    user_id_executor: item.userIdExecutor,
    tipo_entrega_id: item.tipoEntregaId,
    file_path: item.filePath,
    data_entrega: item.dataEntrega,
    observacao: item.observacao,
    outros: item.outros,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    remessa: item.remessa ?? undefined,
    executor: item.executor
      ? { id: item.executor.id, nome: item.executor.nome, email: item.executor.email }
      : undefined,
    tipo_entrega: item.tipoEntrega
      ? { id: item.tipoEntrega.id, tipo: item.tipoEntrega.tipo }
      : undefined,
  };
}
