import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListarAtividadesRecentesQueryDto } from '../dto/listar-atividades-recentes-query.dto';

/** Mesmas opções do ValidationPipe global (main.ts). */
function validar(query: Record<string, unknown>) {
  const instancia = plainToInstance(ListarAtividadesRecentesQueryDto, query, {
    enableImplicitConversion: true,
  });
  const erros = validateSync(instancia, { whitelist: true });
  return { instancia, campos: erros.map((erro) => erro.property) };
}

describe('ListarAtividadesRecentesQueryDto', () => {
  it('usa page 1 e per_page 10 por padrão', () => {
    const { instancia, campos } = validar({});
    expect(campos).toEqual([]);
    expect(instancia.page).toBe(1);
    expect(instancia.per_page).toBe(10);
  });

  it('converte page e per_page da query string', () => {
    const { instancia, campos } = validar({ page: '2', per_page: '50' });
    expect(campos).toEqual([]);
    expect(instancia.page).toBe(2);
    expect(instancia.per_page).toBe(50);
  });

  it('rejeita page menor que 1', () => {
    expect(validar({ page: '0' }).campos).toEqual(['page']);
    expect(validar({ page: '-1' }).campos).toEqual(['page']);
  });

  it('rejeita per_page acima de 50 ou menor que 1', () => {
    expect(validar({ per_page: '51' }).campos).toEqual(['per_page']);
    expect(validar({ per_page: '0' }).campos).toEqual(['per_page']);
  });

  it('rejeita texto e número fracionado', () => {
    expect(validar({ page: 'abc', per_page: 'dez' }).campos).toEqual(['page', 'per_page']);
    expect(validar({ page: '1.5' }).campos).toEqual(['page']);
  });
});
