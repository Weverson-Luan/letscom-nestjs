import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { NotificacaoEmissorService } from 'src/modules/notificacoes/services/notificacao-emissor.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ParticipanteConversaInvalidoException } from '../exceptions/participante-conversa-invalido.exception';
import { SemPermissaoConviteConversaException } from '../exceptions/sem-permissao-convite-conversa.exception';
import { ConversaMensagemRepository } from '../repositories/conversa-mensagem.repository';
import { ConversaParticipanteRepository } from '../repositories/conversa-participante.repository';
import { ConvidarParticipanteConversaService } from '../services/convidar-participante-conversa.service';
import {
  criarParticipanteFake,
  criarParticipanteSubordinadoFake,
  criarUsuarioLogadoFake,
} from './fixtures';

describe('ConvidarParticipanteConversaService', () => {
  const tx = { marcador: 'tx' };
  const prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
  const repository = {
    buscarDaPessoa: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    ehSubordinadoAtivoDoCliente: jest.fn(),
    ehClientePrincipalAtivo: jest.fn(),
    ehInternoAtivo: jest.fn(),
    travarConversa: jest.fn(),
  };
  const mensagemRepository = { buscarNomeCliente: jest.fn() };
  const emissor = { emitir: jest.fn() };
  const operador = criarUsuarioLogadoFake();
  let service: ConvidarParticipanteConversaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConvidarParticipanteConversaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConversaParticipanteRepository, useValue: repository },
        { provide: ConversaMensagemRepository, useValue: mensagemRepository },
        { provide: NotificacaoEmissorService, useValue: emissor },
      ],
    }).compile();
    service = moduleRef.get(ConvidarParticipanteConversaService);
    // 1ª busca: quem convida (dono); 2ª: o convidado, já na transação
    repository.buscarDaPessoa.mockImplementation(async (_clienteId, pessoa) =>
      'userId' in pessoa && pessoa.userId === 7n ? criarParticipanteFake() : null,
    );
    repository.ehSubordinadoAtivoDoCliente.mockResolvedValue(true);
    repository.ehClientePrincipalAtivo.mockResolvedValue(true);
    repository.ehInternoAtivo.mockResolvedValue(true);
    repository.criar.mockResolvedValue(
      criarParticipanteSubordinadoFake({ id: 70n, papel: 'convidado', status: 'pendente' }),
    );
    mensagemRepository.buscarNomeCliente.mockResolvedValue('Empresa X');
  });

  it('operador convida subordinado: cria convite pendente e notifica na mesma transação', async () => {
    const resultado = await service.execute(5n, { subordinado_id: 3 }, operador);

    expect(repository.travarConversa).toHaveBeenCalledWith(5n, tx);
    expect(repository.buscarDaPessoa).toHaveBeenCalledWith(5n, { subordinadoId: 3n }, tx);
    expect(repository.criar).toHaveBeenCalledWith(
      {
        clienteId: 5n,
        userId: null,
        subordinadoId: 3n,
        papel: 'convidado',
        status: 'pendente',
        convidadoPorUserId: 7n,
        convidadoPorSubordinadoId: null,
      },
      tx,
    );
    expect(emissor.emitir).toHaveBeenCalledWith(
      [{ subordinadoId: 3n }],
      {
        tipo: 'convite_conversa',
        titulo: 'Convite para conversa',
        mensagem: 'Operador convidou você para a conversa com a equipe Letscom.',
        link: '/minha-conversa',
        participanteId: 70n,
      },
      tx,
    );
    expect(resultado).toMatchObject({ id: 70n, status: 'pendente', tipo: 'subordinado' });
  });

  it('operador convida outro interno: notificação aponta para a tela do cliente', async () => {
    repository.criar.mockResolvedValue(
      criarParticipanteFake({ id: 71n, userId: 8n, papel: 'convidado', status: 'pendente' }),
    );

    await service.execute(5n, { user_id: 8 }, operador);

    expect(repository.ehInternoAtivo).toHaveBeenCalledWith(8n);
    expect(emissor.emitir).toHaveBeenCalledWith(
      [{ userId: 8n }],
      expect.objectContaining({
        mensagem: 'Operador convidou você para a conversa com Empresa X.',
        link: '/clientes/5',
        participanteId: 71n,
      }),
      tx,
    );
  });

  it('convida o cliente principal pelo user_id do cliente', async () => {
    await service.execute(5n, { user_id: 5 }, operador);
    expect(repository.ehClientePrincipalAtivo).toHaveBeenCalledWith(5n);
    expect(repository.ehInternoAtivo).not.toHaveBeenCalled();
  });

  it('dono do lado do cliente convida alguém da empresa', async () => {
    repository.buscarDaPessoa.mockImplementation(async (_clienteId, pessoa) =>
      'subordinadoId' in pessoa && pessoa.subordinadoId === 3n
        ? criarParticipanteSubordinadoFake()
        : null,
    );
    const subordinado = criarUsuarioLogadoFake({
      tipoLogin: 'subordinado',
      id: 3n,
      nome: 'Compras',
    });

    await service.execute(5n, { subordinado_id: 4 }, subordinado);

    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        subordinadoId: 4n,
        convidadoPorUserId: null,
        convidadoPorSubordinadoId: 3n,
      }),
      tx,
    );
  });

  it('dono do lado do cliente não convida a equipe', async () => {
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteSubordinadoFake());

    await expect(
      service.execute(
        5n,
        { user_id: 8 },
        criarUsuarioLogadoFake({ tipoLogin: 'subordinado', id: 3n }),
      ),
    ).rejects.toBeInstanceOf(SemPermissaoConviteConversaException);
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('reenvia o convite para quem recusou', async () => {
    repository.buscarDaPessoa
      .mockResolvedValueOnce(criarParticipanteFake())
      .mockResolvedValueOnce(
        criarParticipanteSubordinadoFake({ id: 70n, papel: 'convidado', status: 'recusado' }),
      );
    repository.atualizar.mockResolvedValue(
      criarParticipanteSubordinadoFake({ id: 70n, papel: 'convidado', status: 'pendente' }),
    );

    await service.execute(5n, { subordinado_id: 3 }, operador);

    expect(repository.atualizar).toHaveBeenCalledWith(
      70n,
      {
        status: 'pendente',
        respondidoEm: null,
        convidadoPorUserId: 7n,
        convidadoPorSubordinadoId: null,
      },
      tx,
    );
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it.each([
    ['aceito', 'Esta pessoa já participa da conversa.'],
    ['pendente', 'Esta pessoa já tem um convite pendente.'],
    ['inativo', 'Esta pessoa está com o acesso inativo: reative em vez de convidar.'],
  ] as const)('recusa convidar quem está %s (relido na transação)', async (status, mensagem) => {
    repository.buscarDaPessoa
      .mockResolvedValueOnce(criarParticipanteFake())
      .mockResolvedValueOnce(criarParticipanteSubordinadoFake({ status }));

    await expect(service.execute(5n, { subordinado_id: 3 }, operador)).rejects.toThrow(mensagem);
    expect(emissor.emitir).not.toHaveBeenCalled();
  });

  it.each([
    ['nenhum', {}],
    ['os dois', { user_id: 8, subordinado_id: 3 }],
  ])('exige exatamente um identificador (%s)', async (_caso, dados) => {
    await expect(service.execute(5n, dados, operador)).rejects.toBeInstanceOf(
      ParticipanteConversaInvalidoException,
    );
    expect(repository.buscarDaPessoa).not.toHaveBeenCalled();
  });

  it.each([
    ['subordinado de outro cliente', { subordinado_id: 9 }, 'ehSubordinadoAtivoDoCliente'],
    ['cliente principal inativo', { user_id: 5 }, 'ehClientePrincipalAtivo'],
    ['usuário que não é interno ativo', { user_id: 8 }, 'ehInternoAtivo'],
  ] as const)('recusa %s', async (_caso, dados, verificacao) => {
    repository[verificacao].mockResolvedValue(false);

    await expect(service.execute(5n, dados, operador)).rejects.toThrow(
      'Pessoa não encontrada para convite.',
    );
  });

  it('quem não é dono não convida', async () => {
    repository.buscarDaPessoa.mockResolvedValue(criarParticipanteFake({ papel: 'convidado' }));

    await expect(service.execute(5n, { subordinado_id: 3 }, operador)).rejects.toBeInstanceOf(
      SemPermissaoConviteConversaException,
    );
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('convite simultâneo para a mesma pessoa (unique) vira 400, não 500', async () => {
    repository.criar.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicado', { code: 'P2002', clientVersion: 'x' }),
    );

    await expect(service.execute(5n, { subordinado_id: 3 }, operador)).rejects.toThrow(
      'Esta pessoa já tem um convite pendente.',
    );
  });
});
