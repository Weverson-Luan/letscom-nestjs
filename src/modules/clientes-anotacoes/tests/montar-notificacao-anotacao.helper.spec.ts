import { montarNotificacaoAnotacao } from '../services/helpers/montar-notificacao-anotacao.helper';

describe('montarNotificacaoAnotacao', () => {
  const base = {
    anotacaoId: 30n,
    clienteId: 5n,
    clienteNome: 'Empresa X',
    autorNome: 'Maria',
    quantidadeAnexos: 0,
  };

  it('equipe → cliente aponta para /minhas-anotacoes', () => {
    expect(
      montarNotificacaoAnotacao({ ...base, autorTipo: 'interno', conteudo: 'Olá\n\n  tudo bem?' }),
    ).toEqual({
      tipo: 'anotacao_cliente',
      titulo: 'Nova mensagem da equipe Letscom',
      mensagem: 'Maria: Olá tudo bem?',
      link: '/minhas-anotacoes',
      anotacaoId: 30n,
    });
  });

  it('cliente → equipe aponta para a tela do cliente', () => {
    expect(
      montarNotificacaoAnotacao({ ...base, autorTipo: 'cliente', conteudo: 'Ok' }),
    ).toMatchObject({
      titulo: 'Empresa X respondeu',
      link: '/clientes/5',
    });
  });

  it('usa "Cliente" quando o nome não foi encontrado', () => {
    expect(
      montarNotificacaoAnotacao({ ...base, clienteNome: null, autorTipo: 'cliente', conteudo: 'x' })
        .titulo,
    ).toBe('Cliente respondeu');
  });

  it('resume texto longo e descreve anexos quando não há texto', () => {
    const longa = montarNotificacaoAnotacao({
      ...base,
      autorTipo: 'subordinado',
      conteudo: 'a'.repeat(300),
    });
    expect(longa.mensagem).toHaveLength('Maria: '.length + 140);
    expect(longa.mensagem.endsWith('\u2026')).toBe(true);

    expect(
      montarNotificacaoAnotacao({
        ...base,
        autorTipo: 'cliente',
        conteudo: '',
        quantidadeAnexos: 3,
      }).mensagem,
    ).toBe('Maria: Enviou 3 anexos.');
  });
});
