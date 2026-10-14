import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsuarioInternoDuplicadoException } from '../exceptions/usuario-interno-duplicado.exception';
import { traduzirErroDuplicidade } from '../services/helpers/traduzir-erro-duplicidade.helper';

function erroPrisma(code: string, target?: unknown) {
  return new Prisma.PrismaClientKnownRequestError('falhou', {
    code,
    clientVersion: 'test',
    meta: target !== undefined ? { target } : undefined,
  });
}

describe('traduzirErroDuplicidade', () => {
  it.each([
    ['users_email_key', 'Já existe um usuário com este e-mail.'],
    ['users_telefone_key', 'Já existe um usuário com este telefone.'],
    ['users_documento_key', 'Já existe um usuário com este documento.'],
    [['email'], 'Já existe um usuário com este e-mail.'],
  ])('converte o índice %p em 409', (alvo, mensagem) => {
    const resultado = traduzirErroDuplicidade(erroPrisma('P2002', alvo));

    expect(resultado).toBeInstanceOf(UsuarioInternoDuplicadoException);
    expect(resultado).toMatchObject({ message: mensagem, status: HttpStatus.CONFLICT });
  });

  it('usa a mensagem padrão para índice desconhecido', () => {
    expect(traduzirErroDuplicidade(erroPrisma('P2002', 'outro_indice'))).toMatchObject({
      message: 'Já existe um usuário com estes dados.',
    });
  });

  it('devolve sem alteração erros que não são de duplicidade', () => {
    const outroPrisma = erroPrisma('P2025');
    const generico = new Error('boom');

    expect(traduzirErroDuplicidade(outroPrisma)).toBe(outroPrisma);
    expect(traduzirErroDuplicidade(generico)).toBe(generico);
  });
});
