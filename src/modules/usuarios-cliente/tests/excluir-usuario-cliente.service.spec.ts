import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { ExcluirUsuarioClienteRepository } from '../repositories/excluir-usuario-cliente.repository';
import { ExcluirUsuarioClienteService } from '../services/excluir-usuario-cliente.service';

describe('ExcluirUsuarioClienteService', () => {
  let service: ExcluirUsuarioClienteService;
  const repository = {
    buscarPorId: jest.fn(),
    contarRemessasDoSubordinado: jest.fn(),
    excluir: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExcluirUsuarioClienteService,
        { provide: ExcluirUsuarioClienteRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ExcluirUsuarioClienteService);
  });

  it('exclui o usuário sem remessas vinculadas', async () => {
    repository.buscarPorId.mockResolvedValue({ id: 4n });
    repository.contarRemessasDoSubordinado.mockResolvedValue(0);

    await service.execute(4n);

    expect(repository.contarRemessasDoSubordinado).toHaveBeenCalledWith(4n);
    expect(repository.excluir).toHaveBeenCalledWith(4n);
  });

  it('lança 422 quando o usuário não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);

    const erro = await service.execute(4n).catch((excecao) => excecao);

    expect(erro).toBeInstanceOf(BusinessException);
    expect(erro.message).toBe('Usuário não encontrado.');
    expect(erro.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(repository.excluir).not.toHaveBeenCalled();
  });

  it('lança 422 quando o usuário tem remessas vinculadas', async () => {
    repository.buscarPorId.mockResolvedValue({ id: 4n });
    repository.contarRemessasDoSubordinado.mockResolvedValue(1);

    const erro = await service.execute(4n).catch((excecao) => excecao);

    expect(erro).toBeInstanceOf(BusinessException);
    expect(erro.message).toContain('possui remessas vinculadas');
    expect(repository.excluir).not.toHaveBeenCalled();
  });
});
