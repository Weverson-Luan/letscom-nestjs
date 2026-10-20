import { montarNotificacaoMensagem } from '../services/helpers/montar-notificacao-mensagem.helper';

describe('montarNotificacaoMensagem', () => {
  const base = {
    mensagemId: 30n,
    clienteId: 5n,
    clienteNome: 'Empresa X',
    autorNome: 'Maria',
    quantidadeAnexos: 0,
  };

  it('equipe → cliente aponta para /minha-conversa', () => {
    expect(
      montarNotificacaoMensagem({ ...base, autorTipo: 'interno', conteudo: 'Olá\n\n  tudo bem?' }),
    ).toEqual({
      tipo: 'mensagem_conversa',
      titulo: 'Nova mensagem da equipe Letscom',
      mensagem: 'Maria: Olá tudo bem?',
      link: '/minha-conversa',
      conversaMensagemId: 30n,
    });
  });

  it('cliente → equipe aponta para a tela do cliente', () => {
    expect(
      montarNotificacaoMensagem({ ...base, autorTipo: 'cliente', conteudo: 'Ok' }),
    ).toMatchObject({
      titulo: 'Empresa X respondeu',
      link: '/clientes/5',
    });
  });

  it('usa "Cliente" quando o nome não foi encontrado', () => {
    expect(
      montarNotificacaoMensagem({ ...base, clienteNome: null, autorTipo: 'cliente', conteudo: 'x' })
        .titulo,
    ).toBe('Cliente respondeu');
  });

  it('resume texto longo e descreve anexos quando não há texto', () => {
    const longa = montarNotificacaoMensagem({
      ...base,
      autorTipo: 'subordinado',
      conteudo: 'a'.repeat(300),
    });
    expect(longa.mensagem).toHaveLength('Maria: '.length + 140);
    expect(longa.mensagem.endsWith('\u2026')).toBe(true);

    expect(
      montarNotificacaoMensagem({
        ...base,
        autorTipo: 'cliente',
        conteudo: '',
        quantidadeAnexos: 3,
      }).mensagem,
    ).toBe('Maria: Enviou 3 anexos.');
  });

  it('equipe → outro interno participante aponta para a tela do cliente', () => {
    expect(
      montarNotificacaoMensagem({
        ...base,
        autorTipo: 'interno',
        conteudo: 'Ok',
        destino: 'interno',
      }),
    ).toMatchObject({ titulo: 'Nova mensagem na conversa com Empresa X', link: '/clientes/5' });
  });

  it('cliente → outro participante do lado do cliente aponta para /minha-conversa', () => {
    expect(
      montarNotificacaoMensagem({
        ...base,
        autorTipo: 'subordinado',
        conteudo: 'Ok',
        destino: 'cliente',
      }),
    ).toMatchObject({ titulo: 'Nova mensagem na conversa', link: '/minha-conversa' });
  });
});
