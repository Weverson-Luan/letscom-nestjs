/**
 * IMPORTS
 */

import { montarMensagemCadastroDuplicado } from '../services/helpers/montar-mensagem-cadastro-duplicado.helper';

describe('montarMensagemCadastroDuplicado', () => {
  it.each([
    ['users_email_key', 'Já existe um cliente com este e-mail.'],
    ['users_documento_key', 'Já existe um cliente com este documento.'],
    ['users_telefone_key', 'Já existe um cliente com este telefone.'],
    ['users_cliente_email_key', 'Já existe um usuário do cliente com este e-mail.'],
  ])('traduz o índice %s', (indice, mensagem) => {
    expect(montarMensagemCadastroDuplicado(indice)).toBe(mensagem);
  });

  it.each([undefined, null, 'indice_desconhecido', ['email']])(
    'devolve a mensagem padrão quando o alvo é %p',
    (alvo) => {
      expect(montarMensagemCadastroDuplicado(alvo)).toBe('Já existe um cadastro com estes dados.');
    },
  );
});
