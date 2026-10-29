/**
 * IMPORTS
 */
import { RemessaPlanilha } from '@prisma/client';

/** Contrato do Laravel (RemessaFotoController::upload). */
export function montarRespostaFotosEnviadas(caminhos: string[]) {
  return {
    code: 200,
    message: 'Fotos extraídas e salvas com sucesso.',
    files: caminhos,
  };
}

/** Contrato do Laravel (RemessaPlanilhaController::upload), dentro do ApiResponse. */
export function mapearPlanilhaRemessa(planilha: RemessaPlanilha) {
  return {
    id: planilha.id,
    remessa_id: planilha.remessaId,
    cliente_id: planilha.clienteId,
    file_path: planilha.filePath,
    tipo: planilha.tipo,
    created_at: planilha.createdAt,
  };
}
