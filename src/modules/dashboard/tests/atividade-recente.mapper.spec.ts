import { mapearAtividadeRecente } from '../mappers/atividade-recente.mapper';
import { AtividadeRecenteBruta } from '../repositories/dashboard.repository';

describe('mapearAtividadeRecente', () => {
  const base: AtividadeRecenteBruta = {
    tipo: 'remessa_criada',
    numero: null,
    status: null,
    nome: null,
    quantidade: null,
    created_at: new Date('2026-10-20T10:00:00.000Z'),
  };

  it('descreve remessa criada com o nome do cliente', () => {
    expect(mapearAtividadeRecente({ ...base, numero: 1001n, nome: 'Cliente ABC' })).toEqual({
      tipo: 'remessa_criada',
      descricao: 'Nova remessa #1001 criada por Cliente ABC.',
      created_at: '2026-10-20T10:00:00.000Z',
    });
  });

  it('descreve remessa criada sem o " por" quando não há nome do cliente', () => {
    expect(mapearAtividadeRecente({ ...base, numero: 1001n }).descricao).toBe(
      'Nova remessa #1001 criada.',
    );
  });

  it('descreve mudança de status com o autor', () => {
    expect(
      mapearAtividadeRecente({
        ...base,
        tipo: 'status_alterado',
        numero: 52647n,
        status: 'em_producao',
        nome: 'Juliano Vieira',
      }),
    ).toEqual({
      tipo: 'status_alterado',
      descricao: 'Remessa #52647 avançou para em_producao por Juliano Vieira.',
      created_at: '2026-10-20T10:00:00.000Z',
    });
  });

  it('descreve mudança de status sem autor no histórico legado', () => {
    expect(
      mapearAtividadeRecente({
        ...base,
        tipo: 'status_alterado',
        numero: 52647n,
        status: 'conferido',
      }).descricao,
    ).toBe('Remessa #52647 avançou para conferido.');
  });

  it('descreve lote de fotos com a quantidade', () => {
    expect(
      mapearAtividadeRecente({ ...base, tipo: 'fotos_enviadas', numero: 1001n, quantidade: 50n }),
    ).toEqual({
      tipo: 'fotos_enviadas',
      descricao: 'Lote com 50 fotos enviado para remessa #1001.',
      created_at: '2026-10-20T10:00:00.000Z',
    });
  });

  it('descreve cliente cadastrado', () => {
    expect(mapearAtividadeRecente({ ...base, tipo: 'cliente_cadastrado', nome: 'Maria' })).toEqual({
      tipo: 'cliente_cadastrado',
      descricao: 'Novo cliente cadastrado: Maria.',
      created_at: '2026-10-20T10:00:00.000Z',
    });
  });

  it('aceita created_at em string e converte para ISO', () => {
    expect(
      mapearAtividadeRecente({ ...base, numero: 1, created_at: '2026-10-20 10:00:00Z' }).created_at,
    ).toBe('2026-10-20T10:00:00.000Z');
  });
});
