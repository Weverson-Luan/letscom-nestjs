/**
 * IMPORTS
 */
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

// dto
import { AtualizarUsuarioAtendimentoDto } from '../dto/atualizar-usuario-atendimento.dto';
import { CriarUsuarioAtendimentoDto } from '../dto/criar-usuario-atendimento.dto';

/** Mesmas opções do ValidationPipe global (main.ts). */
function validar<T extends object>(classe: new () => T, corpo: Record<string, unknown>) {
  const instancia = plainToInstance(classe, corpo, { enableImplicitConversion: true });
  const erros = validateSync(instancia, { whitelist: true });
  return { instancia, campos: erros.map((erro) => erro.property) };
}

const criacao = { user_id: '7', email: 'a@empresa.com', telefone: '11999999999' };

describe('CriarUsuarioAtendimentoDto', () => {
  it('converte user_id em número e aceita o payload mínimo', () => {
    const { instancia, campos } = validar(CriarUsuarioAtendimentoDto, criacao);

    expect(campos).toEqual([]);
    expect(instancia.user_id).toBe(7);
    expect(instancia.ativo).toBeUndefined();
  });

  it.each(['false', '0', false, 0])('converte ativo %p em false', (ativo) => {
    const { instancia, campos } = validar(CriarUsuarioAtendimentoDto, { ...criacao, ativo });

    expect(campos).toEqual([]);
    expect(instancia.ativo).toBe(false);
  });

  it('rejeita e-mail inválido e telefone ausente', () => {
    const { campos } = validar(CriarUsuarioAtendimentoDto, { user_id: 7, email: 'x' });

    expect(campos.sort()).toEqual(['email', 'telefone']);
  });
});

describe('AtualizarUsuarioAtendimentoDto', () => {
  it("converte ativo 'false' em false", () => {
    const { instancia, campos } = validar(AtualizarUsuarioAtendimentoDto, { ativo: 'false' });

    expect(campos).toEqual([]);
    expect(instancia.ativo).toBe(false);
  });

  it('rejeita ativo fora dos valores booleanos aceitos', () => {
    const { campos } = validar(AtualizarUsuarioAtendimentoDto, { ativo: 'talvez' });

    expect(campos).toEqual(['ativo']);
  });
});
