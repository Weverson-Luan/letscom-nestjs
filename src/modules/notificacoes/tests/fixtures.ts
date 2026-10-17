import { Notificacao } from '@prisma/client';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';

export function criarUsuarioFake(sobrescrever: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 7n,
    email: 'operador@letscom.com',
    nome: 'Operador',
    ativo: true,
    tipoLogin: 'user',
    roles: ['consultor'],
    ...sobrescrever,
  };
}

export function criarNotificacaoFake(sobrescrever: Partial<Notificacao> = {}): Notificacao {
  return {
    id: 50n,
    destinatarioUserId: 7n,
    destinatarioSubordinadoId: null,
    tipo: 'anotacao_cliente',
    titulo: 'Empresa X respondeu',
    mensagem: 'Compras: Ok',
    link: '/clientes/5',
    anotacaoId: 30n,
    lidaEm: null,
    createdAt: new Date('2026-10-16T12:00:00.000Z'),
    ...sobrescrever,
  };
}
