import {
  mapearCandidatoConvite,
  mapearEstadoConversa,
  mapearParticipanteConversa,
} from '../mappers/participante-conversa.mapper';
import {
  criarParticipanteFake,
  criarParticipanteSubordinadoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

describe('mapearParticipanteConversa', () => {
  const usuario = criarUsuarioLogadoFake();

  it('mapeia o interno e marca eh_eu para o usuário logado', () => {
    const participante = criarParticipanteFake();
    expect(mapearParticipanteConversa(participante, usuario)).toEqual({
      id: 60n,
      cliente_id: 5n,
      papel: 'dono',
      status: 'aceito',
      lado: 'interno',
      tipo: 'interno',
      pessoa: { id: 7n, nome: 'Operador', email: 'operador@letscom.com' },
      eh_eu: true,
      convidado_em: participante.createdAt,
      respondido_em: participante.respondidoEm,
      inativado_em: null,
    });
  });

  it('mapeia subordinado e cliente principal como lado do cliente', () => {
    expect(mapearParticipanteConversa(criarParticipanteSubordinadoFake(), usuario)).toMatchObject({
      lado: 'cliente',
      tipo: 'subordinado',
      pessoa: { id: 3n, nome: 'Compras' },
      eh_eu: false,
    });
    expect(
      mapearParticipanteConversa(
        criarParticipanteFake({
          userId: 5n,
          user: { id: 5n, nome: 'Empresa X', email: 'x@x.com' },
        }),
        usuario,
      ),
    ).toMatchObject({ lado: 'cliente', tipo: 'cliente' });
  });

  it('usa e-mail sem nome e "Usuário removido" sem cadastro', () => {
    expect(
      mapearParticipanteConversa(
        criarParticipanteFake({ user: { id: 7n, nome: ' ', email: 'op@x.com' } }),
        usuario,
      ).pessoa.nome,
    ).toBe('op@x.com');
    expect(
      mapearParticipanteConversa(criarParticipanteFake({ user: null }), usuario).pessoa,
    ).toEqual({ id: 7n, nome: 'Usuário removido', email: null });
  });

  it('monta o estado: pode_convidar só para dono aceito', () => {
    const dono = criarParticipanteFake();
    expect(
      mapearEstadoConversa({
        acesso: { participante: dono, iniciada: true, semDonoInterno: false },
        temAcesso: true,
        participantes: [dono],
        usuario,
      }),
    ).toMatchObject({
      iniciada: true,
      tem_acesso: true,
      pode_convidar: true,
      minha_participacao: { id: 60n, papel: 'dono', status: 'aceito' },
      participantes: [{ id: 60n, eh_eu: true }],
    });
    expect(
      mapearEstadoConversa({
        acesso: { participante: null, iniciada: false, semDonoInterno: true },
        temAcesso: true,
        participantes: [],
        usuario,
      }),
    ).toEqual({
      iniciada: false,
      tem_acesso: true,
      pode_convidar: false,
      minha_participacao: null,
      participantes: [],
    });
  });

  it('classifica o candidato pelo lado e pelo vínculo', () => {
    const base = { nome: 'X', email: 'x@x.com' };
    expect(
      mapearCandidatoConvite({ ...base, user_id: 5n, subordinado_id: null }, 'cliente').tipo,
    ).toBe('cliente');
    expect(
      mapearCandidatoConvite({ ...base, user_id: null, subordinado_id: 3n }, 'cliente').tipo,
    ).toBe('subordinado');
    expect(
      mapearCandidatoConvite({ ...base, user_id: 8n, subordinado_id: null }, 'interno').tipo,
    ).toBe('interno');
  });
});
