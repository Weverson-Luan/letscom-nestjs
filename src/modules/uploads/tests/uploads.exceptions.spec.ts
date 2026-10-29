/**
 * IMPORTS
 */
import { HttpStatus } from '@nestjs/common';

// shared / exceptions
import { BusinessException } from 'src/shared/exceptions/business.exception';

// exceptions
import { ArquivoObrigatorioException } from '../exceptions/arquivo-obrigatorio.exception';
import { RemessaNaoEncontradaException } from '../exceptions/remessa-nao-encontrada.exception';

describe('Exceptions de uploads', () => {
  it('RemessaNaoEncontradaException é BusinessException 404 com a mensagem do Laravel', () => {
    const excecao = new RemessaNaoEncontradaException();

    expect(excecao).toBeInstanceOf(BusinessException);
    expect(excecao.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(excecao.message).toBe('Remessa não encontrada.');
  });

  it.each(['zip_file', 'file'])(
    'ArquivoObrigatorioException(%p) é BusinessException 400 citando o campo',
    (campo) => {
      const excecao = new ArquivoObrigatorioException(campo);

      expect(excecao).toBeInstanceOf(BusinessException);
      expect(excecao.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(excecao.message).toBe(`O campo ${campo} é obrigatório.`);
    },
  );
});
