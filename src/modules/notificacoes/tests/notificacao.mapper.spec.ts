import { mapearNotificacao } from '../mappers/notificacao.mapper';
import { criarNotificacaoFake } from './fixtures';

describe('mapearNotificacao', () => {
  it('mapeia para snake_case sem expor o destinatário', () => {
    const notificacao = criarNotificacaoFake();
    expect(mapearNotificacao(notificacao)).toEqual({
      id: 50n,
      tipo: 'anotacao_cliente',
      titulo: 'Empresa X respondeu',
      mensagem: 'Compras: Ok',
      link: '/clientes/5',
      anotacao_id: 30n,
      convite: null,
      lida: false,
      lida_em: null,
      created_at: notificacao.createdAt,
    });
  });

  it('expõe id e status do convite nas notificações de convite', () => {
    const notificacao = {
      ...criarNotificacaoFake({ tipo: 'convite_conversa', anotacaoId: null, participanteId: 9n }),
      participante: { id: 9n, status: 'pendente' as const },
    };
    expect(mapearNotificacao(notificacao)).toMatchObject({
      tipo: 'convite_conversa',
      convite: { id: 9n, status: 'pendente' },
    });
  });

  it('marca como lida quando lida_em está preenchido', () => {
    const lidaEm = new Date();
    expect(mapearNotificacao(criarNotificacaoFake({ lidaEm }))).toMatchObject({
      lida: true,
      lida_em: lidaEm,
    });
  });
});
