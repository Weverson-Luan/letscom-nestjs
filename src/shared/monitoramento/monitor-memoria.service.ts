import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getHeapStatistics } from 'v8';

const MEGABYTE = 1024 * 1024;
const INTERVALO_PADRAO_MS = 60_000;
const PERCENTUAL_ALERTA_PADRAO = 80;

/**
 * Registra periodicamente o uso de memória do processo e emite alerta quando o heap
 * se aproxima do limite do V8. Serve para correlacionar o crescimento de memória
 * com horários/endpoints antes de um OOM (variáveis: MONITOR_MEMORIA_INTERVALO_MS
 * e MONITOR_MEMORIA_PERCENTUAL_ALERTA; intervalo 0 desliga).
 */
@Injectable()
export class MonitorMemoriaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitorMemoriaService.name);
  private temporizador?: NodeJS.Timeout;

  constructor(private readonly configuracao: ConfigService) {}

  onModuleInit() {
    const intervalo = Number(
      this.configuracao.get('MONITOR_MEMORIA_INTERVALO_MS') ?? INTERVALO_PADRAO_MS,
    );
    if (!Number.isFinite(intervalo) || intervalo <= 0) return;

    this.temporizador = setInterval(() => this.registrar(), intervalo);
    this.temporizador.unref();
  }

  onModuleDestroy() {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  registrar() {
    const memoria = process.memoryUsage();
    const limiteHeap = getHeapStatistics().heap_size_limit;
    const percentualHeap = (memoria.heapUsed / limiteHeap) * 100;
    const percentualAlerta = Number(
      this.configuracao.get('MONITOR_MEMORIA_PERCENTUAL_ALERTA') ?? PERCENTUAL_ALERTA_PADRAO,
    );

    const mensagem =
      `heapUsed=${Math.round(memoria.heapUsed / MEGABYTE)}MB ` +
      `heapLimite=${Math.round(limiteHeap / MEGABYTE)}MB (${percentualHeap.toFixed(1)}%) ` +
      `externa=${Math.round(memoria.external / MEGABYTE)}MB ` +
      `buffers=${Math.round(memoria.arrayBuffers / MEGABYTE)}MB ` +
      `rss=${Math.round(memoria.rss / MEGABYTE)}MB`;

    if (percentualHeap >= percentualAlerta) {
      this.logger.warn(`Heap próximo do limite: ${mensagem}`);
    } else {
      this.logger.log(mensagem);
    }
  }
}
