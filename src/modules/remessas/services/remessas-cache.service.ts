import { Injectable } from '@nestjs/common';
import { VersionedCacheService } from 'src/shared/cache/versioned-cache.service';

interface ListParams {
  page?: number | string;
  per_page?: number | string;
  search?: string;
}

/**
 * Espelha as chaves de cache versionado do RemessasResponseHelper (Laravel):
 * cada listagem tem uma version-key; incrementá-la invalida todas as entradas.
 */
@Injectable()
export class RemessasCacheService {
  constructor(private readonly cache: VersionedCacheService) {}

  private suffix(params: ListParams): string {
    const page = Number(params.page ?? 1);
    const perPage = Number(params.per_page ?? 10);
    const search = this.cache.md5(String(params.search ?? ''));
    return `p${page}:pp${perPage}:s${search}`;
  }

  // ---- em andamento (por cliente) ----
  private andamentoVerKey = (clienteId: number) => `remessas_andamento_ver:${clienteId}`;
  async andamentoKey(clienteId: number, params: ListParams) {
    const v = await this.cache.getVersion(this.andamentoVerKey(clienteId));
    return `remessas_andamento:${clienteId}:v${v}:${this.suffix(params)}`;
  }
  invalidarAndamento = (clienteId: number) => this.cache.bumpVersion(this.andamentoVerKey(clienteId));

  // ---- historico (por cliente) ----
  private historicoVerKey = (clienteId: number) => `remessas_historico_ver:${clienteId}`;
  async historicoKey(clienteId: number, params: ListParams) {
    const v = await this.cache.getVersion(this.historicoVerKey(clienteId));
    return `remessas_historico:${clienteId}:v${v}:${this.suffix(params)}`;
  }
  invalidarHistorico = (clienteId: number) => this.cache.bumpVersion(this.historicoVerKey(clienteId));

  // ---- minhas tarefas (por usuário, versão global) ----
  private minhasTarefasVerKey = 'remessas_minhas_tarefas_ver';
  async minhasTarefasKey(userId: number, params: ListParams) {
    const v = await this.cache.getVersion(this.minhasTarefasVerKey);
    return `remessas_minhas_tarefas:u${userId}:v${v}:${this.suffix(params)}`;
  }
  invalidarMinhasTarefas = () => this.cache.bumpVersion(this.minhasTarefasVerKey);

  // ---- tarefas disponiveis (global) ----
  private tarefasDisponiveisVerKey = 'remessas_tarefas_disponiveis_ver';
  async tarefasDisponiveisKey(params: ListParams) {
    const v = await this.cache.getVersion(this.tarefasDisponiveisVerKey);
    return `remessas_tarefas_disponiveis:v${v}:${this.suffix(params)}`;
  }
  invalidarTarefasDisponiveis = () => this.cache.bumpVersion(this.tarefasDisponiveisVerKey);

  // ---- tarefas em expedicao (por usuário, versão global) ----
  private tarefasExpedicaoVerKey = 'remessas_tarefas_expedicao_ver';
  async tarefasEmExpedicaoKey(userId: number, params: ListParams) {
    const v = await this.cache.getVersion(this.tarefasExpedicaoVerKey);
    return `remessas_tarefas_expedicao:u${userId}:v${v}:${this.suffix(params)}`;
  }
  invalidarTarefasEmExpedicao = () => this.cache.bumpVersion(this.tarefasExpedicaoVerKey);

  // ---- tarefas balcao (por usuário, versão global) ----
  private tarefasBalcaoVerKey = 'remessas_tarefas_balcao_ver';
  async tarefasBalcaoKey(userId: number, params: ListParams) {
    const v = await this.cache.getVersion(this.tarefasBalcaoVerKey);
    return `remessas_tarefas_balcao:u${userId}:v${v}:${this.suffix(params)}`;
  }
  invalidarTarefasBalcao = () => this.cache.bumpVersion(this.tarefasBalcaoVerKey);

  /** Invalida todas as listagens afetadas por uma transição de status. */
  async invalidarTudo(clienteId: number) {
    await Promise.all([
      this.invalidarAndamento(clienteId),
      this.invalidarMinhasTarefas(),
      this.invalidarTarefasDisponiveis(),
      this.invalidarTarefasEmExpedicao(),
      this.invalidarTarefasBalcao(),
      this.invalidarHistorico(clienteId),
    ]);
  }

  remember<T>(key: string, ttlSeconds: number, factory: () => Promise<T>) {
    return this.cache.remember(key, ttlSeconds, factory);
  }
}
