/**
 * IMPORTS
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getHeapStatistics } from 'v8';

// shared / monitoramento (serviço testado)
import { MonitorMemoriaService } from './monitor-memoria.service';

jest.mock('v8', () => ({ getHeapStatistics: jest.fn() }));

const estatisticasHeap = getHeapStatistics as jest.Mock;

function criarServico(valores: Record<string, unknown> = {}) {
  const configuracao = { get: (chave: string) => valores[chave] } as unknown as ConfigService;
  return new MonitorMemoriaService(configuracao);
}

describe('MonitorMemoriaService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('registra log informativo quando o heap está abaixo do limite de alerta', () => {
    estatisticasHeap.mockReturnValue({ heap_size_limit: 1_000_000_000_000 });
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const aviso = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    criarServico().registrar();

    expect(log).toHaveBeenCalledTimes(1);
    expect(aviso).not.toHaveBeenCalled();
  });

  it('emite alerta quando o heap passa do percentual configurado', () => {
    estatisticasHeap.mockReturnValue({ heap_size_limit: 1 });
    const aviso = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    criarServico().registrar();

    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('Heap próximo do limite'));
  });

  it('agenda o registro periódico e para ao destruir o módulo', () => {
    jest.useFakeTimers();
    const servico = criarServico({ MONITOR_MEMORIA_INTERVALO_MS: 1000 });
    const registrar = jest.spyOn(servico, 'registrar').mockImplementation();

    servico.onModuleInit();
    jest.advanceTimersByTime(3000);
    expect(registrar).toHaveBeenCalledTimes(3);

    servico.onModuleDestroy();
    jest.advanceTimersByTime(3000);
    expect(registrar).toHaveBeenCalledTimes(3);
  });

  it('não agenda nada quando o intervalo é 0', () => {
    jest.useFakeTimers();
    const servico = criarServico({ MONITOR_MEMORIA_INTERVALO_MS: 0 });
    const registrar = jest.spyOn(servico, 'registrar').mockImplementation();

    servico.onModuleInit();
    jest.advanceTimersByTime(120_000);

    expect(registrar).not.toHaveBeenCalled();
  });
});
