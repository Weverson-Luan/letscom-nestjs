import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { ParticipanteConversaNaoEncontradoException } from '../exceptions/participante-conversa-nao-encontrado.exception';
import { SemPermissaoConviteConversaException } from '../exceptions/sem-permissao-convite-conversa.exception';
import {
  AcessoConversa,
  calcularVisivelDesde,
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
  validarGestaoParticipante,
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

  describe('calcularVisivelDesde', () => {
    const operador = criarUsuarioLogadoFake();
    const admin = criarUsuarioLogadoFake({ roles: ['admin'] });
    const aceitouEm = new Date('2026-10-15T09:00:00.000Z');
    const comParticipante = (
      sobrescrever: Parameters<typeof criarParticipanteFake>[0],
    ): AcessoConversa => ({
      participante: criarParticipanteFake(sobrescrever),
      iniciada: true,
      semDonoInterno: false,
    });

    it('convidado aceito vê a partir de quando aceitou', () => {
      expect(
        calcularVisivelDesde(
          comParticipante({ papel: 'convidado', respondidoEm: aceitouEm }),
          5n,
          operador,
        ),
      ).toEqual(aceitouEm);
    });

    it('convidado aceito sem respondidoEm usa a data do convite', () => {
      const convidadoEm = new Date('2026-10-14T09:00:00.000Z');
      expect(
        calcularVisivelDesde(
          comParticipante({ papel: 'convidado', respondidoEm: null, createdAt: convidadoEm }),
          5n,
          operador,
        ),
      ).toEqual(convidadoEm);
    });

    it('dono vê todo o histórico', () => {
      expect(calcularVisivelDesde(comParticipante({ papel: 'dono' }), 5n, operador)).toBeNull();
    });

    it('admin vê todo o histórico mesmo sendo convidado', () => {
      expect(
        calcularVisivelDesde(
          comParticipante({ papel: 'convidado', respondidoEm: aceitouEm }),
          5n,
          admin,
        ),
      ).toBeNull();
    });

    it.each(['pendente', 'recusado', 'inativo'] as const)(
      'convidado com status %s não tem corte (o acesso é decidido antes)',
      (status) => {
        expect(
          calcularVisivelDesde(
            comParticipante({ papel: 'convidado', status, respondidoEm: aceitouEm }),
            5n,
            operador,
          ),
        ).toBeNull();
      },
    );

    it('interno convidado vê tudo quando não há dono interno ativo', () => {
      const acesso = {
        ...comParticipante({ papel: 'convidado', respondidoEm: aceitouEm }),
        semDonoInterno: true,
      };
      expect(calcularVisivelDesde(acesso, 5n, operador)).toBeNull();
    });

    it('subordinado convidado mantém o corte mesmo sem dono interno ativo', () => {
      const subordinado = criarUsuarioLogadoFake({
        tipoLogin: 'subordinado',
        id: 3n,
        clienteId: 5n,
      });
      const acesso = {
        ...comParticipante({
          userId: null,
          subordinadoId: 3n,
          papel: 'convidado',
          respondidoEm: aceitouEm,
        }),
        semDonoInterno: true,
      };
      expect(calcularVisivelDesde(acesso, 5n, subordinado)).toEqual(aceitouEm);
    });

    it('quem entra sem convite (sem dono interno ativo) vê todo o histórico', () => {
      expect(
        calcularVisivelDesde(
          { participante: null, iniciada: true, semDonoInterno: true },
          5n,
          operador,
        ),
      ).toBeNull();
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

    it('acesso inativo não entra nem sem dono interno ativo; admin inativado entra', () => {
      const participante = criarParticipanteFake({ papel: 'convidado', status: 'inativo' });
      expect(
        temAcessoConversa({ ...iniciada, participante, semDonoInterno: true }, 5n, operador),
      ).toBe(false);
      expect(
        temAcessoConversa(
          { ...iniciada, participante },
          5n,
          criarUsuarioLogadoFake({ roles: ['admin'] }),
        ),
      ).toBe(true);
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

  describe('validarGestaoParticipante', () => {
    const dono = criarParticipanteFake();
    const convidado = criarParticipanteSubordinadoFake({ papel: 'convidado' });

    it('devolve o participante quando o dono pode geri-lo', () => {
      expect(
        validarGestaoParticipante({
          dono,
          participante: convidado,
          clienteId: 5n,
          acao: 'inativar',
        }),
      ).toBe(convidado);
    });

    it('404 para inexistente ou de outra conversa', () => {
      expect(() =>
        validarGestaoParticipante({ dono, participante: null, clienteId: 5n, acao: 'inativar' }),
      ).toThrow(ParticipanteConversaNaoEncontradoException);
      expect(() =>
        validarGestaoParticipante({
          dono,
          participante: { ...convidado, clienteId: 6n },
          clienteId: 5n,
          acao: 'reativar',
        }),
      ).toThrow(ParticipanteConversaNaoEncontradoException);
    });

    it('400 para dono, com a ação na mensagem', () => {
      expect(() =>
        validarGestaoParticipante({
          dono,
          participante: { ...convidado, papel: 'dono' },
          clienteId: 5n,
          acao: 'inativar',
        }),
      ).toThrow('Não é possível inativar quem iniciou a conversa.');
    });

    it('403 quando o dono do lado do cliente tenta gerir a equipe', () => {
      expect(() =>
        validarGestaoParticipante({
          dono: criarParticipanteSubordinadoFake(),
          participante: criarParticipanteFake({ id: 62n, userId: 8n, papel: 'convidado' }),
          clienteId: 5n,
          acao: 'reativar',
        }),
      ).toThrow(SemPermissaoConviteConversaException);
    });
  });
});
