import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { SolicitacaoRemessaService } from '../services/solicitacao-remessa.service';
import { UploadFile } from '../services/remessa.service';

const STATUS_VALIDOS = [
  'envio_de_dados',
  'em_producao',
  'conferido',
  'pedido_liberado',
  'concluido',
];

const POSICAO_VALIDAS = ['h', 'H', 'v', 'V'];

/** Espelha RemessaController::solicitacaoRemessasPorCliente (validação + fluxo). */
@Injectable()
export class SolicitarRemessaUseCase {
  constructor(private readonly solicitacaoService: SolicitacaoRemessaService) {}

  async execute(
    body: Record<string, any>,
    csvFile?: UploadFile,
    zipFile?: UploadFile,
  ): Promise<{ status: number; body: any }> {
    const errors = this.validate(body);
    if (Object.keys(errors).length > 0) {
      return { status: 422, body: { status: 422, message: 'Erro de validação', errors } };
    }

    // Estrutural: ZIP exige CSV + campo_chave
    if (zipFile && (!csvFile || !body.campo_chave)) {
      return {
        status: 422,
        body: {
          status: 422,
          message: 'Erro de validação',
          errors: {
            campo_chave: ['Para envio de fotos é obrigatório informar planilha e campo chave.'],
          },
        },
      };
    }

    try {
      const remessa = await this.solicitacaoService.executar(body, csvFile, zipFile);
      return {
        status: 201,
        body: { status: 201, message: 'Remessa solicitada com sucesso!', data: remessa },
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        return {
          status: 422,
          body: {
            status: 422,
            message: 'Erro de regra de negócio',
            errors: { message: error.message },
          },
        };
      }
      if (error instanceof NotFoundException) {
        return {
          status: 404,
          body: { status: 404, message: 'Entidade não encontrada', errors: { message: error.message } },
        };
      }
      return { status: 500, body: { status: 500, message: 'Erro interno no servidor' } };
    }
  }

  private validate(body: Record<string, any>): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    const int = (v: any) => v !== undefined && v !== null && /^\d+$/.test(String(v));

    if (!int(body.cliente_id)) errors.cliente_id = ['O campo cliente é obrigatório.'];
    if (!body.user_id_solicitante_remessa && !body.users_solicitante_subordinado_id) {
      const msg =
        'Informe o solicitante em users (user_id_solicitante_remessa) ou o subordinado do portal (users_solicitante_subordinado_id).';
      errors.user_id_solicitante_remessa = [msg];
    }
    if (!int(body.modelo_tecnico_id)) errors.modelo_tecnico_id = ['O modelo técnico deve ser informado.'];
    if (!int(body.tecnologia_id)) errors.tecnologia_id = ['A tecnologia deve ser informada.'];
    if (!int(body.total_solicitacoes) || Number(body.total_solicitacoes) < 1) {
      errors.total_solicitacoes = ['O total de solicitações deve ser maior que zero.'];
    }
    if (!body.situacao) errors.situacao = ['A situação da remessa deve ser informada.'];
    if (!STATUS_VALIDOS.includes(body.status)) {
      errors.status = [
        'O status da remessa deve ser um valor válido do fluxo (envio_de_dados, em_producao, conferido, pedido_liberado, concluido).',
      ];
    }
    if (!body.posicao) {
      errors.posicao = ['A posição da remessa deve ser informada.'];
    } else if (!POSICAO_VALIDAS.includes(String(body.posicao))) {
      errors.posicao = ['A posição da remessa deve ser h ou v.'];
    }
    if (!int(body.produto_id)) errors.produto_id = ['O produto deve ser informado.'];
    if (!body.nome) errors.nome = ['O nome para ciência de responsabilidade é obrigatório.'];
    if (!body.documento) {
      errors.documento = ['O documento para ciência de responsabilidade é obrigatório.'];
    } else if (String(body.documento).length < 11 || String(body.documento).length > 20) {
      errors.documento = ['O documento deve ter entre 11 e 20 caracteres.'];
    }
    return errors;
  }
}
