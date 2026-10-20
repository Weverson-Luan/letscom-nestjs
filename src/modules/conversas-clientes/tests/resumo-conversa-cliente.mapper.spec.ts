import { mapearResumoConversaCliente } from '../mappers/resumo-conversa-cliente.mapper';
import { criarLinhaResumoFake } from './fixtures';

describe('mapearResumoConversaCliente', () => {
  it('converte ativo (tinyint) e total (bigint) do SQL cru', () => {
    const linha = criarLinhaResumoFake();
    expect(mapearResumoConversaCliente(linha)).toEqual({
      id: 5n,
      nome: 'Empresa X',
      email: 'contato@empresax.com',
      telefone: '11988887777',
      documento: '12345678000199',
      ativo: true,
      total_mensagens: 3,
      ultima_mensagem_em: linha.ultima_mensagem_em,
    });
  });

  it('mantém cliente sem mensagem com total zero e data nula', () => {
    expect(
      mapearResumoConversaCliente(
        criarLinhaResumoFake({ ativo: 0, total_mensagens: 0n, ultima_mensagem_em: null }),
      ),
    ).toMatchObject({ ativo: false, total_mensagens: 0, ultima_mensagem_em: null });
  });
});
