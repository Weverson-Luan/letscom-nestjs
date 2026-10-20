import {
  montarDestinatarioDoUsuario,
  montarFiltroDestinatario,
  removerDestinatariosRepetidos,
} from '../services/helpers/destinatario-notificacao.helper';
import { criarUsuarioFake } from './fixtures';

describe('destinatário de notificação', () => {
  it('usuário de users vira userId; subordinado vira subordinadoId', () => {
    expect(montarDestinatarioDoUsuario(criarUsuarioFake())).toEqual({ userId: 7n });
    expect(
      montarDestinatarioDoUsuario(criarUsuarioFake({ tipoLogin: 'subordinado', id: 3n })),
    ).toEqual({ subordinadoId: 3n });
  });

  it('monta o filtro da caixa pela coluna certa', () => {
    expect(montarFiltroDestinatario({ userId: 7n })).toEqual({ destinatarioUserId: 7n });
    expect(montarFiltroDestinatario({ subordinadoId: 3n })).toEqual({
      destinatarioSubordinadoId: 3n,
    });
  });

  it('remove repetidos sem confundir users e users_cliente com o mesmo id', () => {
    expect(
      removerDestinatariosRepetidos([
        { userId: 7n },
        { userId: 7n },
        { subordinadoId: 7n },
        { subordinadoId: 7n },
      ]),
    ).toEqual([{ userId: 7n }, { subordinadoId: 7n }]);
  });
});
