import { ActivityLog } from '@prisma/client';

export function mapActivityLog(log: ActivityLog) {
  return {
    id: log.id,
    user_id: log.userId,
    user_nome: log.userNome,
    user_tipo: log.userTipo,
    evento: log.evento,
    metodo: log.metodo,
    rota: log.rota,
    status_code: log.statusCode,
    ip: log.ip,
    user_agent: log.userAgent,
    payload: log.payload,
    created_at: log.createdAt,
  };
}
