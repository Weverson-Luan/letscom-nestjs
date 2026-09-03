import { EntregaCliente } from '@prisma/client';

export function mapEntregaCliente(item: EntregaCliente) {
  return {
    id: item.id,
    remessa_id: item.remessaId,
    responsavel_recebimento: item.responsavelRecebimento,
    imagem_protocolo: item.imagemProtocolo,
    data_entrega: item.dataEntrega,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}
