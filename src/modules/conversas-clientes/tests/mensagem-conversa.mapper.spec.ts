import { mapearMensagemConversa } from '../mappers/mensagem-conversa.mapper';
import { criarAnexoFake, criarMensagemFake, criarUsuarioLogadoFake } from './fixtures';

describe('mapearMensagemConversa', () => {
  it('mapeia para snake_case com autor, anexos e permissões do autor interno', () => {
    const mensagem = criarMensagemFake({ anexos: [criarAnexoFake()] });

    expect(mapearMensagemConversa(mensagem, criarUsuarioLogadoFake())).toEqual({
      id: 30n,
      cliente_id: 5n,
      conteudo: 'Cliente pediu orçamento.',
      autor: { id: 7n, nome: 'Operador', tipo: 'interno' },
      eh_minha: true,
      editada: false,
      editada_em: null,
      pode_editar: true,
      pode_excluir: true,
      created_at: mensagem.createdAt,
      updated_at: mensagem.updatedAt,
      anexos: [
        {
          id: 40n,
          nome_original: 'orçamento.pdf',
          mime_type: 'application/pdf',
          tamanho_bytes: 2048,
          created_at: mensagem.createdAt,
        },
      ],
    });
  });

  it('não expõe file_path e calcula permissões para outro usuário', () => {
    const editadaEm = new Date('2026-10-11T00:00:00.000Z');
    const resposta = mapearMensagemConversa(
      criarMensagemFake({ editadaEm, anexos: [criarAnexoFake()] }),
      criarUsuarioLogadoFake({ id: 99n }),
    );

    expect(resposta).toMatchObject({
      editada: true,
      editada_em: editadaEm,
      eh_minha: false,
      pode_editar: false,
      pode_excluir: false,
    });
    expect(
      JSON.stringify(resposta, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)),
    ).not.toContain('clientes/5');
  });

  it('usa nome (ou e-mail) do subordinado e marca como minha para ele', () => {
    const mensagem = criarMensagemFake({
      autorId: null,
      autor: null,
      autorTipo: 'subordinado',
      autorSubordinadoId: 3n,
      autorSubordinado: { id: 3n, nome: null, email: 'compras@empresax.com' },
    });
    const subordinado = criarUsuarioLogadoFake({ id: 3n, tipoLogin: 'subordinado', clienteId: 5n });

    expect(mapearMensagemConversa(mensagem, subordinado)).toMatchObject({
      autor: { id: 3n, nome: 'compras@empresax.com', tipo: 'subordinado' },
      eh_minha: true,
      pode_editar: false,
      pode_excluir: false,
    });
  });

  it('mostra "Usuário removido" quando o autor foi apagado', () => {
    const mensagem = criarMensagemFake({
      autorId: null,
      autor: null,
      autorTipo: 'subordinado',
      autorSubordinadoId: null,
      autorSubordinado: null,
    });

    expect(mapearMensagemConversa(mensagem, criarUsuarioLogadoFake()).autor).toEqual({
      id: null,
      nome: 'Usuário removido',
      tipo: 'subordinado',
    });
  });
});
