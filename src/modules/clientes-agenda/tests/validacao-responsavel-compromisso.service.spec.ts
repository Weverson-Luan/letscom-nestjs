import { ResponsavelCompromissoInvalidoException } from '../exceptions/responsavel-compromisso-invalido.exception';
import { ResponsavelCompromissoRepository } from '../repositories/responsavel-compromisso.repository';
import { ValidacaoResponsavelCompromissoService } from '../services/validacao-responsavel-compromisso.service';

describe('ValidacaoResponsavelCompromissoService', () => {
  const repository = { ehUsuarioInternoAtivo: jest.fn(), ehSubordinadoAtivoDoCliente: jest.fn() };
  const service = new ValidacaoResponsavelCompromissoService(
    repository as unknown as ResponsavelCompromissoRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('sem responsável é válido sem consultar', async () => {
    await expect(
      service.validar(5n, { responsavelId: null, responsavelSubordinadoId: null }),
    ).resolves.toBeUndefined();
    expect(repository.ehUsuarioInternoAtivo).not.toHaveBeenCalled();
    expect(repository.ehSubordinadoAtivoDoCliente).not.toHaveBeenCalled();
  });

  it('o próprio cliente é válido sem consultar', async () => {
    await expect(
      service.validar(5n, { responsavelId: 5n, responsavelSubordinadoId: null }),
    ).resolves.toBeUndefined();
    expect(repository.ehUsuarioInternoAtivo).not.toHaveBeenCalled();
  });

  it('interno ativo é válido; inativo lança 400', async () => {
    repository.ehUsuarioInternoAtivo.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      service.validar(5n, { responsavelId: 8n, responsavelSubordinadoId: null }),
    ).resolves.toBeUndefined();
    await expect(
      service.validar(5n, { responsavelId: 9n, responsavelSubordinadoId: null }),
    ).rejects.toBeInstanceOf(ResponsavelCompromissoInvalidoException);
    expect(repository.ehUsuarioInternoAtivo).toHaveBeenNthCalledWith(1, 8n);
    expect(repository.ehUsuarioInternoAtivo).toHaveBeenNthCalledWith(2, 9n);
  });

  it('subordinado ativo do cliente é válido; inativo ou de outro cliente lança 400', async () => {
    repository.ehSubordinadoAtivoDoCliente.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      service.validar(5n, { responsavelId: null, responsavelSubordinadoId: 3n }),
    ).resolves.toBeUndefined();
    await expect(
      service.validar(5n, { responsavelId: null, responsavelSubordinadoId: 4n }),
    ).rejects.toBeInstanceOf(ResponsavelCompromissoInvalidoException);
    expect(repository.ehSubordinadoAtivoDoCliente).toHaveBeenNthCalledWith(1, 5n, 3n);
    expect(repository.ehSubordinadoAtivoDoCliente).toHaveBeenNthCalledWith(2, 5n, 4n);
    expect(repository.ehUsuarioInternoAtivo).not.toHaveBeenCalled();
  });
});
