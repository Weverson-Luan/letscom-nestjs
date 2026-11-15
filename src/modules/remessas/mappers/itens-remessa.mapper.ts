/**
 * IMPORTS
 */
import { ListarItensRemessaService } from '../services/listar-itens-remessa.service';

type ItensRemessa = Awaited<ReturnType<ListarItensRemessaService['execute']>>;

/** dd/mm/aaaa hh:mm, igual ao `created_at` dos itens na listagem de remessas. */
function formatarDataHora(data: Date | null): string | null {
  if (!data) return null;
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${data.getFullYear()} ${hora}:${minuto}`;
}

export function mapItensRemessa({ colunas, dataSolicitacao, itens }: ItensRemessa) {
  const createdAt = formatarDataHora(dataSolicitacao);
  return {
    colunas,
    itens: itens.map((item) => ({
      foto_id: item.foto?.id ?? null,
      matricula: item.foto?.matricula ?? null,
      url: item.url,
      created_at: createdAt,
      dados: item.dados,
    })),
  };
}
