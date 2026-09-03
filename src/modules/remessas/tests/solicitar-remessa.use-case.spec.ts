import { Test, TestingModule } from '@nestjs/testing';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { SolicitarRemessaUseCase } from '../use-cases/solicitar-remessa.use-case';
import { SolicitacaoRemessaService } from '../services/solicitacao-remessa.service';

describe('SolicitarRemessaUseCase', () => {
  let useCase: SolicitarRemessaUseCase;
  const solicitacaoService = { executar: jest.fn() };

  const bodyValido = {
    cliente_id: '1',
    user_id_solicitante_remessa: '2',
    modelo_tecnico_id: '3',
    tecnologia_id: '4',
    total_solicitacoes: '100',
    situacao: 'normal',
    status: 'envio_de_dados',
    posicao: 'h',
    produto_id: '5',
    nome: 'João Silva',
    documento: '12345678901',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitarRemessaUseCase,
        { provide: SolicitacaoRemessaService, useValue: solicitacaoService },
      ],
    }).compile();

    useCase = module.get(SolicitarRemessaUseCase);
    jest.clearAllMocks();
  });

  it('retorna 422 quando campos obrigatórios estão ausentes', async () => {
    const result = await useCase.execute({});

    expect(result.status).toBe(422);
    expect(result.body.errors.cliente_id).toBeDefined();
    expect(result.body.errors.modelo_tecnico_id).toBeDefined();
    expect(result.body.errors.tecnologia_id).toBeDefined();
    expect(result.body.errors.produto_id).toBeDefined();
  });

  it('retorna 422 quando status é inválido', async () => {
    const result = await useCase.execute({
      ...bodyValido,
      status: 'status_invalido',
    });

    expect(result.status).toBe(422);
    expect(result.body.errors.status).toBeDefined();
  });

  it('retorna 422 quando posição é inválida', async () => {
    const result = await useCase.execute({
      ...bodyValido,
      posicao: 'diagonal',
    });

    expect(result.status).toBe(422);
    expect(result.body.errors.posicao).toBeDefined();
  });

  it('retorna 422 quando ZIP é enviado sem planilha e campo_chave', async () => {
    const zipFile = {
      originalname: 'fotos.zip',
      buffer: Buffer.from(''),
      mimetype: 'application/zip',
    } as never;

    const result = await useCase.execute(bodyValido, undefined, zipFile);

    expect(result.status).toBe(422);
    expect(result.body.errors.campo_chave).toBeDefined();
  });

  it('solicita remessa com sucesso', async () => {
    const remessa = { id: 1, numeroRemessa: 1001 };
    solicitacaoService.executar.mockResolvedValue(remessa);

    const result = await useCase.execute(bodyValido);

    expect(result.status).toBe(201);
    expect(result.body.message).toBe('Remessa solicitada com sucesso!');
    expect(result.body.data).toEqual(remessa);
    expect(solicitacaoService.executar).toHaveBeenCalledWith(bodyValido, undefined, undefined);
  });

  it('retorna 422 em erro de regra de negócio', async () => {
    solicitacaoService.executar.mockRejectedValue(
      new BusinessException('Cliente sem crédito suficiente'),
    );

    const result = await useCase.execute(bodyValido);

    expect(result.status).toBe(422);
    expect(result.body.errors.message).toBe('Cliente sem crédito suficiente');
  });
});
