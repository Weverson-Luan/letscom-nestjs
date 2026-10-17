import { mapearAnotacaoCliente } from '../mappers/anotacao-cliente.mapper';
import { criarAnexoFake, criarAnotacaoFake, criarUsuarioLogadoFake } from './fixtures';

describe('mapearAnotacaoCliente', () => {
  it('mapeia para snake_case com autor, anexos e permissões do autor interno', () => {
    const anotacao = criarAnotacaoFake({ anexos: [criarAnexoFake()] });

    expect(mapearAnotacaoCliente(anotacao, criarUsuarioLogadoFake())).toEqual({
      id: 30n,
      cliente_id: 5n,
      tipo: 'ligacao',
      conteudo: 'Cliente pediu orçamento.',
      autor: { id: 7n, nome: 'Operador', tipo: 'interno' },
      eh_minha: true,
      editada: false,
      editada_em: null,
      pode_editar: true,
      pode_excluir: true,
      created_at: anotacao.createdAt,
      updated_at: anotacao.updatedAt,
      anexos: [
        {
          id: 40n,
          nome_original: 'orçamento.pdf',
          mime_type: 'application/pdf',
          tamanho_bytes: 2048,
          created_at: anotacao.createdAt,
        },
      ],
    });
  });

  it('não expõe file_path e calcula permissões para outro usuário', () => {
    const editadaEm = new Date('2026-10-11T00:00:00.000Z');
    const resposta = mapearAnotacaoCliente(
      criarAnotacaoFake({ editadaEm, anexos: [criarAnexoFake()] }),
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
    const anotacao = criarAnotacaoFake({
      autorId: null,
      autor: null,
      autorTipo: 'subordinado',
      autorSubordinadoId: 3n,
      autorSubordinado: { id: 3n, nome: null, email: 'compras@empresax.com' },
    });
    const subordinado = criarUsuarioLogadoFake({ id: 3n, tipoLogin: 'subordinado', clienteId: 5n });

    expect(mapearAnotacaoCliente(anotacao, subordinado)).toMatchObject({
      autor: { id: 3n, nome: 'compras@empresax.com', tipo: 'subordinado' },
      eh_minha: true,
      pode_editar: false,
      pode_excluir: false,
    });
  });

  it('mostra "Usuário removido" quando o autor foi apagado', () => {
    const anotacao = criarAnotacaoFake({
      autorId: null,
      autor: null,
      autorTipo: 'subordinado',
      autorSubordinadoId: null,
      autorSubordinado: null,
    });

    expect(mapearAnotacaoCliente(anotacao, criarUsuarioLogadoFake()).autor).toEqual({
      id: null,
      nome: 'Usuário removido',
      tipo: 'subordinado',
    });
  });
});
