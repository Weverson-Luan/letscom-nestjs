/**
 * IMPORTS
 */
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

// dto
import { CreateUserClienteDto } from '../dto/create-user-cliente.dto';
import { UpdateUserClienteDto } from '../dto/update-user-cliente.dto';

/** Mesmas opções do ValidationPipe global (main.ts). */
function validar<T extends object>(classe: new () => T, corpo: Record<string, unknown>) {
  const instancia = plainToInstance(classe, corpo, { enableImplicitConversion: true });
  const erros = validateSync(instancia, { whitelist: true });
  return { instancia, campos: erros.map((erro) => erro.property) };
}

const criacao = { cliente_id: 1, email: 'sub@empresa.com', senha: 'senha123' };

describe('CreateUserClienteDto', () => {
  it.each(['0', 'false', 0, false])(
    'converte ativo %p em false (não em true pela conversão implícita)',
    (ativo) => {
      const { instancia, campos } = validar(CreateUserClienteDto, { ...criacao, ativo });

      expect(campos).toEqual([]);
      expect(instancia.ativo).toBe(false);
    },
  );

  it.each(['1', 'true', 1, true])('converte ativo %p em true', (ativo) => {
    const { instancia, campos } = validar(CreateUserClienteDto, { ...criacao, ativo });

    expect(campos).toEqual([]);
    expect(instancia.ativo).toBe(true);
  });

  it('mantém ativo ausente como undefined', () => {
    const { instancia, campos } = validar(CreateUserClienteDto, criacao);

    expect(campos).toEqual([]);
    expect(instancia.ativo).toBeUndefined();
  });
});

describe('UpdateUserClienteDto', () => {
  it("converte ativo '0' em false", () => {
    const { instancia, campos } = validar(UpdateUserClienteDto, { ativo: '0' });

    expect(campos).toEqual([]);
    expect(instancia.ativo).toBe(false);
  });

  it('rejeita ativo fora dos valores booleanos aceitos', () => {
    const { campos } = validar(UpdateUserClienteDto, { ativo: 'talvez' });

    expect(campos).toEqual(['ativo']);
  });
});
