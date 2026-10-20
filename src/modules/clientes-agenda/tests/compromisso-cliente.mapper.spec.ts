import {
  ehAtrasado,
  mapearCompromissoCliente,
  mapearCompromissoInterno,
} from '../mappers/compromisso-cliente.mapper';
import { criarCompromissoFake } from './fixtures';

describe('mapearCompromissoInterno', () => {
  const antes = new Date('2026-10-20T00:00:00.000Z');
  const depois = new Date('2026-10-22T00:00:00.000Z');

  it('mapeia o compromisso no formato do contrato interno', () => {
    expect(mapearCompromissoInterno(criarCompromissoFake(), antes)).toEqual({
      id: 1n,
      cliente_id: 5n,
      tipo: 'reuniao',
      titulo: 'Apresentar proposta',
      descricao: 'Levar amostras PVC',
      agendado_para: new Date('2026-10-21T14:00:00.000Z'),
      status: 'pendente',
      concluido_em: null,
      visivel_cliente: true,
      atrasado: false,
      autor: { id: 7n, nome: 'Operador' },
      responsavel: { tipo: 'interno', id: 8n, nome: 'Consultor' },
      created_at: new Date('2026-10-19T12:00:00.000Z'),
      updated_at: new Date('2026-10-19T12:00:00.000Z'),
    });
  });

  it('marca atrasado quando pendente e a data já passou', () => {
    expect(mapearCompromissoInterno(criarCompromissoFake(), depois).atrasado).toBe(true);
  });

  it('responsável nulo quando não há responsável', () => {
    const compromisso = criarCompromissoFake({ responsavelId: null, responsavel: null });
    expect(mapearCompromissoInterno(compromisso, antes).responsavel).toBeNull();
  });

  it('usa "Usuário removido" quando autor ou responsável não vêm', () => {
    const compromisso = criarCompromissoFake({
      autor: null as unknown as { id: bigint; nome: string },
      responsavel: null,
    });

    const resultado = mapearCompromissoInterno(compromisso, antes);

    expect(resultado.autor).toEqual({ id: 7n, nome: 'Usuário removido' });
    expect(resultado.responsavel).toEqual({ tipo: 'interno', id: 8n, nome: 'Usuário removido' });
  });

  it('responsável igual ao cliente vem com tipo cliente', () => {
    const compromisso = criarCompromissoFake({
      responsavelId: 5n,
      responsavel: { id: 5n, nome: 'Cliente' },
    });
    expect(mapearCompromissoInterno(compromisso, antes).responsavel).toEqual({
      tipo: 'cliente',
      id: 5n,
      nome: 'Cliente',
    });
  });

  it('responsável subordinado usa users_cliente.id e cai para o e-mail sem nome', () => {
    const compromisso = criarCompromissoFake({
      responsavelId: null,
      responsavel: null,
      responsavelSubordinadoId: 3n,
      responsavelSubordinado: { id: 3n, nome: null, email: 'sub@cliente.com' },
    });
    expect(mapearCompromissoInterno(compromisso, antes).responsavel).toEqual({
      tipo: 'subordinado',
      id: 3n,
      nome: 'sub@cliente.com',
    });
  });

  it('subordinado responsável removido vira "Usuário removido"', () => {
    const compromisso = criarCompromissoFake({
      responsavelId: null,
      responsavel: null,
      responsavelSubordinadoId: 3n,
      responsavelSubordinado: null,
    });
    expect(mapearCompromissoInterno(compromisso, antes).responsavel).toEqual({
      tipo: 'subordinado',
      id: 3n,
      nome: 'Usuário removido',
    });
  });

  it('usa "Usuário removido" quando o nome está em branco', () => {
    const compromisso = criarCompromissoFake({ autor: { id: 7n, nome: '  ' } });
    expect(mapearCompromissoInterno(compromisso, antes).autor.nome).toBe('Usuário removido');
  });

  it('usa a data atual quando `agora` não é informado', () => {
    const passado = criarCompromissoFake({ agendadoPara: new Date('2000-01-01T00:00:00.000Z') });
    expect(mapearCompromissoInterno(passado).atrasado).toBe(true);
  });
});

describe('mapearCompromissoCliente', () => {
  it('omite visivel_cliente e autor, mantendo o responsável', () => {
    const resultado = mapearCompromissoCliente(
      criarCompromissoFake(),
      new Date('2026-10-20T00:00:00.000Z'),
    );

    expect(resultado).not.toHaveProperty('visivel_cliente');
    expect(resultado).not.toHaveProperty('autor');
    expect(resultado).toEqual(
      expect.objectContaining({
        id: 1n,
        cliente_id: 5n,
        atrasado: false,
        responsavel: { tipo: 'interno', id: 8n, nome: 'Consultor' },
      }),
    );
  });

  it('usa a data atual quando `agora` não é informado', () => {
    const futuro = criarCompromissoFake({ agendadoPara: new Date('2999-01-01T00:00:00.000Z') });
    expect(mapearCompromissoCliente(futuro).atrasado).toBe(false);
  });
});

describe('ehAtrasado', () => {
  const agora = new Date('2026-10-22T00:00:00.000Z');

  it.each(['concluido', 'cancelado'] as const)('não atrasa compromisso %s', (status) => {
    expect(ehAtrasado(criarCompromissoFake({ status }), agora)).toBe(false);
  });

  it('não atrasa quando a data é exatamente agora', () => {
    expect(ehAtrasado(criarCompromissoFake({ agendadoPara: agora }), agora)).toBe(false);
  });
});
