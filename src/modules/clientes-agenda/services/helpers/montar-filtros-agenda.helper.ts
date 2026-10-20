import { ListarAgendaQueryDto } from '../../dto/listar-agenda-query.dto';
import { FiltrosAgenda } from '../../repositories/cliente-compromisso.repository';

const SOMENTE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const FIM_DO_DIA_MS = 24 * 60 * 60 * 1000 - 1;

/** `ate` só com data (AAAA-MM-DD) inclui o dia inteiro (até 23:59:59.999 UTC). */
function converterAte(ate: string): Date {
  const data = new Date(ate);
  return SOMENTE_DATA.test(ate) ? new Date(data.getTime() + FIM_DO_DIA_MS) : data;
}

/** Converte a query (já validada pelo DTO) nos filtros do repository, sem o `clienteId`. */
export function montarFiltrosAgenda(
  query: ListarAgendaQueryDto,
): Omit<FiltrosAgenda, 'clienteId' | 'somenteVisiveisCliente'> {
  return {
    status: query.status,
    tipo: query.tipo,
    de: query.de ? new Date(query.de) : undefined,
    ate: query.ate ? converterAte(query.ate) : undefined,
    search: query.search?.trim() || undefined,
  };
}
