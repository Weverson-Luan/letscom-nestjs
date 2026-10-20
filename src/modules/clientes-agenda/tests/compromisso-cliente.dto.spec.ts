import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AtualizarCompromissoClienteDto } from '../dto/atualizar-compromisso-cliente.dto';
import { CriarCompromissoClienteDto } from '../dto/criar-compromisso-cliente.dto';
import { ListarAgendaQueryDto } from '../dto/listar-agenda-query.dto';
import { ListarResponsaveisQueryDto } from '../dto/listar-responsaveis-query.dto';

/** Mesmas opções do ValidationPipe global (main.ts). */
function validar<T extends object>(classe: new () => T, corpo: Record<string, unknown>) {
  const instancia = plainToInstance(classe, corpo, { enableImplicitConversion: true });
  const erros = validateSync(instancia, { whitelist: true });
  return { instancia, campos: erros.map((erro) => erro.property) };
}

describe('CriarCompromissoClienteDto', () => {
  const valido = { titulo: 'Reunião', agendado_para: '2026-10-21T14:00:00.000Z' };

  it('aceita o mínimo e apara o título', () => {
    const { instancia, campos } = validar(CriarCompromissoClienteDto, {
      ...valido,
      titulo: '  Reunião  ',
    });
    expect(campos).toEqual([]);
    expect(instancia.titulo).toBe('Reunião');
  });

  it('exige título não vazio e agendado_para ISO', () => {
    const { campos } = validar(CriarCompromissoClienteDto, {
      titulo: '   ',
      agendado_para: 'amanhã',
    });
    expect(campos).toEqual(expect.arrayContaining(['titulo', 'agendado_para']));
  });

  it('rejeita título acima de 191, descrição acima de 5000, tipo e responsável inválidos', () => {
    const { campos } = validar(CriarCompromissoClienteDto, {
      ...valido,
      titulo: 'x'.repeat(192),
      descricao: 'x'.repeat(5001),
      tipo: 'almoco',
      responsavel_id: 0,
    });
    expect(campos).toEqual(
      expect.arrayContaining(['titulo', 'descricao', 'tipo', 'responsavel_id']),
    );
  });

  it('aceita título com exatamente 191 caracteres', () => {
    expect(
      validar(CriarCompromissoClienteDto, { ...valido, titulo: 'x'.repeat(191) }).campos,
    ).toEqual([]);
  });

  it.each(['', null])('aceita descricao %p', (descricao) => {
    expect(validar(CriarCompromissoClienteDto, { ...valido, descricao }).campos).toEqual([]);
  });

  it('normaliza visivel_cliente e rejeita valor que não é booleano', () => {
    expect(
      validar(CriarCompromissoClienteDto, { ...valido, visivel_cliente: 'true' }).instancia
        .visivel_cliente,
    ).toBe(true);
    expect(
      validar(CriarCompromissoClienteDto, { ...valido, visivel_cliente: 'talvez' }).campos,
    ).toEqual(['visivel_cliente']);
  });
});

describe('CriarCompromissoClienteDto via multipart/form-data (tudo chega como texto)', () => {
  const valido = { titulo: 'Reunião', agendado_para: '2026-10-21T14:00:00.000Z' };

  it('converte ids numéricos em texto', () => {
    const { instancia, campos } = validar(CriarCompromissoClienteDto, {
      ...valido,
      responsavel_id: '8',
      tipo: 'reuniao',
    });
    expect(campos).toEqual([]);
    expect(instancia.responsavel_id).toBe(8);
    const sub = validar(CriarCompromissoClienteDto, { ...valido, responsavel_subordinado_id: '3' });
    expect(sub.campos).toEqual([]);
    expect(sub.instancia.responsavel_subordinado_id).toBe(3);
  });

  it.each([
    ['true', true],
    ['false', false],
    ['1', true],
    ['0', false],
  ])('visivel_cliente %p vira %p', (texto, esperado) => {
    const { instancia, campos } = validar(CriarCompromissoClienteDto, {
      ...valido,
      visivel_cliente: texto,
    });
    expect(campos).toEqual([]);
    expect(instancia.visivel_cliente).toBe(esperado);
  });

  it('campos opcionais vazios são tratados como ausentes', () => {
    const { instancia, campos } = validar(CriarCompromissoClienteDto, {
      ...valido,
      tipo: '',
      descricao: '',
      responsavel_id: '',
      responsavel_subordinado_id: '',
      visivel_cliente: '',
    });
    expect(campos).toEqual([]);
    expect(instancia.tipo).toBeUndefined();
    expect(instancia.responsavel_id).toBeUndefined();
    expect(instancia.responsavel_subordinado_id).toBeUndefined();
    expect(instancia.visivel_cliente).toBeUndefined();
  });

  it('continua rejeitando texto inválido', () => {
    expect(
      validar(CriarCompromissoClienteDto, {
        ...valido,
        responsavel_id: 'abc',
        visivel_cliente: 'talvez',
        tipo: 'almoco',
      }).campos,
    ).toEqual(expect.arrayContaining(['responsavel_id', 'visivel_cliente', 'tipo']));
  });

  it('JSON continua igual: números e booleanos nativos', () => {
    const { instancia, campos } = validar(CriarCompromissoClienteDto, {
      ...valido,
      responsavel_id: 8,
      visivel_cliente: false,
    });
    expect(campos).toEqual([]);
    expect(instancia.responsavel_id).toBe(8);
    expect(instancia.visivel_cliente).toBe(false);
  });
});

describe('AtualizarCompromissoClienteDto', () => {
  it('aceita corpo vazio', () => {
    expect(validar(AtualizarCompromissoClienteDto, {}).campos).toEqual([]);
  });

  it('aceita responsavel_id null (remove o responsável)', () => {
    const { instancia, campos } = validar(AtualizarCompromissoClienteDto, { responsavel_id: null });
    expect(campos).toEqual([]);
    expect(instancia.responsavel_id).toBeNull();
  });

  it.each(['', null])('aceita descricao %p para limpar a descrição', (descricao) => {
    expect(validar(AtualizarCompromissoClienteDto, { descricao }).campos).toEqual([]);
  });

  it.each(['titulo', 'tipo', 'agendado_para', 'status', 'visivel_cliente'])(
    'rejeita %s null (coluna NOT NULL)',
    (campo) => {
      expect(validar(AtualizarCompromissoClienteDto, { [campo]: null }).campos).toEqual([campo]);
    },
  );

  it('rejeita status inválido e título vazio', () => {
    const { campos } = validar(AtualizarCompromissoClienteDto, { status: 'feito', titulo: '' });
    expect(campos).toEqual(expect.arrayContaining(['status', 'titulo']));
  });
});

describe('ListarAgendaQueryDto', () => {
  it('aceita filtros válidos', () => {
    expect(
      validar(ListarAgendaQueryDto, {
        status: 'concluido',
        tipo: 'ligacao',
        de: '2026-10-01',
        ate: '2026-10-31T23:00:00Z',
      }).campos,
    ).toEqual([]);
  });

  it('rejeita status, tipo e datas inválidos', () => {
    const { campos } = validar(ListarAgendaQueryDto, {
      status: 'x',
      tipo: 'y',
      de: '01/10/2026',
      ate: 'ontem',
    });
    expect(campos).toEqual(expect.arrayContaining(['status', 'tipo', 'de', 'ate']));
  });
});

describe('responsavel_subordinado_id', () => {
  const valido = { titulo: 'Reunião', agendado_para: '2026-10-21T14:00:00.000Z' };

  it.each([0, -1, 1.5, 'abc'])('rejeita %p nos dois DTOs', (valor) => {
    expect(
      validar(CriarCompromissoClienteDto, { ...valido, responsavel_subordinado_id: valor }).campos,
    ).toEqual(['responsavel_subordinado_id']);
    expect(
      validar(AtualizarCompromissoClienteDto, { responsavel_subordinado_id: valor }).campos,
    ).toEqual(['responsavel_subordinado_id']);
  });

  it('aceita id positivo e null no AtualizarCompromissoClienteDto', () => {
    expect(
      validar(CriarCompromissoClienteDto, { ...valido, responsavel_subordinado_id: 3 }).campos,
    ).toEqual([]);
    const { instancia, campos } = validar(AtualizarCompromissoClienteDto, {
      responsavel_subordinado_id: null,
    });
    expect(campos).toEqual([]);
    expect(instancia.responsavel_subordinado_id).toBeNull();
  });
});

describe('ListarResponsaveisQueryDto', () => {
  it('aceita paginação e busca de até 100 caracteres', () => {
    expect(
      validar(ListarResponsaveisQueryDto, { page: '2', per_page: '20', search: 'x'.repeat(100) })
        .campos,
    ).toEqual([]);
  });

  it('rejeita busca acima de 100 caracteres', () => {
    expect(validar(ListarResponsaveisQueryDto, { search: 'x'.repeat(101) }).campos).toEqual([
      'search',
    ]);
  });
});
