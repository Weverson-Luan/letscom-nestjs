/**
 * IMPORTS
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

// shared
import { FeatureGateService } from 'src/shared/auth/feature-gate.service';
import { AuthUser } from 'src/shared/decorators/current-user.decorator';
import { StorageService } from 'src/shared/storage/storage.service';
import { converterTextoVazioEmNulo } from 'src/shared/utils/converter-texto-vazio-em-nulo';
import { SpreadsheetService } from 'src/shared/utils/spreadsheet.service';

// repositories
import { ListarItensRemessaRepository } from '../repositories/listar-itens-remessa.repository';

// helpers
import { FotoItemRemessa, montarItensRemessa } from './helpers/montar-itens-remessa.helper';

const SEM_ITENS = { colunas: [] as string[], dataSolicitacao: null as Date | null, itens: [] };

/**
 * Itens da remessa para a tela de detalhe: as linhas da planilha, cada uma com a
 * foto dela quando houver. Sem planilha (ou planilha sem dados), devolve lista vazia.
 */
@Injectable()
export class ListarItensRemessaService {
  private readonly logger = new Logger(ListarItensRemessaService.name);

  constructor(
    private readonly repository: ListarItensRemessaRepository,
    private readonly storage: StorageService,
    private readonly spreadsheet: SpreadsheetService,
    private readonly featureGate: FeatureGateService,
  ) {}

  async execute(id: bigint, usuario: AuthUser) {
    const remessa = await this.repository.buscarRemessaComFotosEPlanilha(id);
    if (!remessa || !this.podeVerRemessa(usuario, remessa.clienteId)) {
      throw new NotFoundException('Remessa não encontrada.');
    }

    const planilha = remessa.planilhas[0];
    if (!planilha?.filePath) return SEM_ITENS;

    const conteudo = await this.storage.download(planilha.filePath);
    if (!conteudo) {
      this.logger.warn(`Planilha da remessa ${id} não encontrada no storage: ${planilha.filePath}`);
      return SEM_ITENS;
    }

    // a extensão do arquivo vem antes do `tipo`: o upload avulso aceita `tipo` livre
    const extensaoArquivo = planilha.filePath.includes('.')
      ? planilha.filePath.split('.').pop()
      : '';
    const extensao = (extensaoArquivo || planilha.tipo || 'xlsx').toLowerCase();
    let linhas;
    try {
      linhas = await this.spreadsheet.parse(conteudo, extensao);
    } catch (erro) {
      this.logger.warn(`Não foi possível ler a planilha da remessa ${id}: ${String(erro)}`);
      return SEM_ITENS;
    }

    const { colunas, itens } = montarItensRemessa(
      linhas,
      remessa.fotos as FotoItemRemessa[],
      converterTextoVazioEmNulo(remessa.modeloTecnico?.campoChave) ?? '',
    );

    return {
      colunas,
      dataSolicitacao: remessa.createdAt,
      itens: await Promise.all(
        itens.map(async (item) => ({
          ...item,
          url: item.foto ? await this.storage.getSignedUrl(item.foto.filePath) : null,
        })),
      ),
    };
  }

  /** Cliente e subordinado só veem remessas do próprio cliente; a equipe interna vê todas. */
  private podeVerRemessa(usuario: AuthUser, clienteIdRemessa: bigint): boolean {
    if (!this.featureGate.isUsuarioCliente(usuario)) return true;
    const clienteIdUsuario = usuario.tipoLogin === 'subordinado' ? usuario.clienteId : usuario.id;
    return clienteIdUsuario === clienteIdRemessa;
  }
}
