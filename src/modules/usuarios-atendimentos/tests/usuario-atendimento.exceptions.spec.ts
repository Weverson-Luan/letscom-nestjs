/**
 * IMPORTS
 */
import { HttpStatus } from '@nestjs/common';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

// exceptions
import { UsuarioAtendimentoNaoEncontradoException } from '../exceptions/usuario-atendimento-nao-encontrado.exception';
import { UsuarioDonoNaoEncontradoException } from '../exceptions/usuario-dono-nao-encontrado.exception';

describe('Exceptions de usuarios-atendimentos', () => {
  it.each([
    [UsuarioAtendimentoNaoEncontradoException, 'Atendimento não encontrado.'],
    [UsuarioDonoNaoEncontradoException, 'Usuário não encontrado.'],
  ])('%p é BusinessException 404 com a mensagem do Laravel', (Excecao, mensagem) => {
    const excecao = new Excecao();

    expect(excecao).toBeInstanceOf(BusinessException);
    expect(excecao.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(excecao.message).toBe(mensagem);
  });
});
