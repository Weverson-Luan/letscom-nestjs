import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { ParticipanteConversaNaoEncontradoException } from '../exceptions/participante-conversa-nao-encontrado.exception';
import { SemPermissaoConviteConversaException } from '../exceptions/sem-permissao-convite-conversa.exception';
import {
  AcessoConversa,
  ehAdminConversa,
  ehDonoInternoAtivo,
  ehMesmaPessoa,
  ladoDoParticipante,
  ladoDoUsuario,
  montarAcessoConversa,
  montarPessoaDoUsuario,
  temAcessoConversa,
  validarConvitePendenteDoUsuario,
  validarDonoConversa,
} from '../services/helpers/participante-conversa.helper';
import {
  criarDonoFake,
  criarParticipanteFake,
  criarParticipanteSubordinadoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

describe('participante-conversa.helper', () => {
  it('monta a pessoa do usuário logado (users ou users_cliente)', () => {
    expect(montarPessoaDoUsuario(criarUsuarioLogadoFake())).toEqual({ userId: 7n });
    expect(
      montarPessoaDoUsuario(criarUsuarioLogadoFake({ tipoLogin: 'subordinado', id: 3n })),
    ).toEqual({ subordinadoId: 3n });
  });

  it('subordinado e cliente principal são do lado do cliente; o resto é equipe', () => {
    expect(ladoDoParticipante({ userId: null, subordinadoId: 3n }, 5n)).toBe('cliente');
    expect(ladoDoParticipante({ userId: 5n, subordinadoId: null }, 5n)).toBe('cliente');
    expect(ladoDoParticipante({ userId: 7n, subordinadoId: null }, 5n)).toBe('interno');
  });

  it('calcula o lado do usuário logado', () => {
    expect(ladoDoUsuario(criarUsuarioLogadoFake(), 5n)).toBe('interno');
    expect(ladoDoUsuario(criarUsuarioLogadoFake({ id: 5n, roles: ['cliente'] }), 5n)).toBe(
      'cliente',
    );
    expect(ladoDoUsuario(criarUsuarioLogadoFake({ tipoLogin: 'subordinado', id: 7n }), 5n)).toBe(
      'cliente',
    );
  });

  it('admin só vale para login interno', () => {
    expect(ehAdminConversa(criarUsuarioLogadoFake({ roles: ['admin'] }))).toBe(true);
    expect(ehAdminConversa(criarUsuarioLogadoFake())).toBe(false);
    expect(
      ehAdminConversa(criarUsuarioLogadoFake({ tipoLogin: 'subordinado', roles: ['admin'] })),
    ).toBe(false);
  });

  it('compara participante e pessoa sem confundir users com users_cliente de mesmo id', () => {
    expect(ehMesmaPessoa({ userId: 3n, subordinadoId: null }, { userId: 3n })).toBe(true);
    expect(ehMesmaPessoa({ userId: 3n, subordinadoId: null }, { subordinadoId: 3n })).toBe(false);
    expect(ehMesmaPessoa({ userId: null, subordinadoId: 3n }, { subordinadoId: 3n })).toBe(true);
  });

  describe('ehDonoInternoAtivo', () => {
    it('só conta dono interno com cadastro ativo e não excluído', () => {
      expect(ehDonoInternoAtivo(criarDonoFake(), 5n)).toBe(true);
      expect(
        ehDonoInternoAtivo(criarDonoFake({ user: { ativo: false, deletedAt: null } }), 5n),
      ).toBe(false);
      expect(
        ehDonoInternoAtivo(criarDonoFake({ user: { ativo: true, deletedAt: new Date() } }), 5n),
      ).toBe(false);
      expect(ehDonoInternoAtivo(criarDonoFake({ user: null }), 5n)).toBe(false);
      expect(ehDonoInternoAtivo(criarDonoFake({ userId: 5n }), 5n)).toBe(false);
    });
  });

  describe('montarAcessoConversa', () => {
    it('iniciada com qualquer dono; sem dono interno quando o operador dono está inativo', () => {
      const donos = [
        criarDonoFake({ user: { ativo: false, deletedAt: null } }),
        criarDonoFake({ id: 2n, userId: null, subordinadoId: 3n, user: null }),
      ];
      expect(montarAcessoConversa(null, donos, 5n)).toEqual({
        participante: null,
        iniciada: true,
        semDonoInterno: true,
      });
      expect(montarAcessoConversa(null, [], 5n)).toMatchObject({
        iniciada: false,
        semDonoInterno: true,
      });
    });
  });

  describe('temAcessoConversa', () => {
    const operador = criarUsuarioLogadoFake();
    const subordinado = criarUsuarioLogadoFake({ tipoLogin: 'subordinado', id: 3n, clienteId: 5n });
    const iniciada: AcessoConversa = { participante: null, iniciada: true, semDonoInterno: false };

    it('participante com convite aceito entra', () => {
      expect(
        temAcessoConversa({ ...iniciada, participante: criarParticipanteFake() }, 5n, operador),
      ).toBe(true);
    });

    it.each(['pendente', 'recusado'] as const)('convite %s não dá acesso', (status) => {
      const participante = criarParticipanteFake({ papel: 'convidado', status });
      expect(temAcessoConversa({ ...iniciada, participante }, 5n, operador)).toBe(false);
    });

    it('admin entra sem convite; interno comum não', () => {
      expect(temAcessoConversa(iniciada, 5n, criarUsuarioLogadoFake({ roles: ['admin'] }))).toBe(
        true,
      );
      expect(temAcessoConversa(iniciada, 5n, operador)).toBe(false);
    });

    it('sem dono interno ativo, qualquer interno entra', () => {
      expect(temAcessoConversa({ ...iniciada, semDonoInterno: true }, 5n, operador)).toBe(true);
    });

    it('lado do cliente: entra antes de iniciada, não depois sem convite, nem pela regra da equipe', () => {
      expect(
        temAcessoConversa(
          { participante: null, iniciada: false, semDonoInterno: true },
          5n,
          subordinado,
        ),
      ).toBe(true);
      expect(temAcessoConversa({ ...iniciada, semDonoInterno: true }, 5n, subordinado)).toBe(false);
    });
  });

  describe('validarDonoConversa', () => {
    it('devolve o dono com acesso aceito', () => {
      const dono = criarParticipanteFake();
      expect(validarDonoConversa(dono)).toBe(dono);
    });

    it.each([
      ['convidado', criarParticipanteFake({ papel: 'convidado' })],
      ['dono sem aceite', criarParticipanteFake({ status: 'pendente' })],
      ['sem participação', null],
    ])('recusa %s', (_caso, participante) => {
      expect(() => validarDonoConversa(participante)).toThrow(SemPermissaoConviteConversaException);
    });
  });

  describe('validarConvitePendenteDoUsuario', () => {
    const convidado = criarUsuarioLogadoFake({ tipoLogin: 'subordinado', id: 3n, clienteId: 5n });
    const convite = criarParticipanteSubordinadoFake({ papel: 'convidado', status: 'pendente' });

    it('devolve o convite pendente do próprio usuário', () => {
      expect(validarConvitePendenteDoUsuario(convite, convidado)).toBe(convite);
    });

    it('convite inexistente ou de outra pessoa é 404', () => {
      expect(() => validarConvitePendenteDoUsuario(null, convidado)).toThrow(
        ParticipanteConversaNaoEncontradoException,
      );
      // users.id 3 não é o subordinado 3
      expect(() =>
        validarConvitePendenteDoUsuario(convite, criarUsuarioLogadoFake({ id: 3n })),
      ).toThrow('Convite não encontrado.');
    });

    it('convite já respondido é 400', () => {
      expect(() =>
        validarConvitePendenteDoUsuario({ ...convite, status: 'aceito' }, convidado),
      ).toThrow(ParticipanteConversaInvalidoException);
    });
  });
});
