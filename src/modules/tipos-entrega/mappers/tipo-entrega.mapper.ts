import { TipoEntrega, TipoEntregaUser } from '@prisma/client';

export function mapTipoEntrega(item: TipoEntrega) {
  return {
    id: item.id,
    tipo: item.tipo,
    ativo: item.ativo,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function mapTipoEntregaUser(
  item: TipoEntregaUser & { tipoEntrega?: TipoEntrega | null },
) {
  return {
    id: item.id,
    cliente_id: item.clienteId,
    tipo_entrega_id: item.tipoEntregaId,
    tipo_entrega: item.tipoEntrega ? mapTipoEntrega(item.tipoEntrega) : null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}
