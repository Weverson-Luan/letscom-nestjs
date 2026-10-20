import { montarFiltrosAgenda } from '../services/helpers/montar-filtros-agenda.helper';

describe('montarFiltrosAgenda', () => {
  it('sem query não filtra nada', () => {
    expect(montarFiltrosAgenda({})).toEqual({
      status: undefined,
      tipo: undefined,
      de: undefined,
      ate: undefined,
      search: undefined,
    });
  });

  it('converte status, tipo, período e busca aparada', () => {
    expect(
      montarFiltrosAgenda({
        status: 'pendente',
        tipo: 'visita',
        de: '2026-10-01T10:00:00.000Z',
        ate: '2026-10-31T18:00:00.000Z',
        search: '  proposta ',
      }),
    ).toEqual({
      status: 'pendente',
      tipo: 'visita',
      de: new Date('2026-10-01T10:00:00.000Z'),
      ate: new Date('2026-10-31T18:00:00.000Z'),
      search: 'proposta',
    });
  });

  it('"ate" só com data inclui o dia inteiro; "de" só com data começa à meia-noite', () => {
    const filtros = montarFiltrosAgenda({ de: '2026-10-01', ate: '2026-10-31' });

    expect(filtros.de).toEqual(new Date('2026-10-01T00:00:00.000Z'));
    expect(filtros.ate).toEqual(new Date('2026-10-31T23:59:59.999Z'));
  });

  it('busca só com espaços é ignorada', () => {
    expect(montarFiltrosAgenda({ search: '   ' }).search).toBeUndefined();
  });
});
