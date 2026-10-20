import { HttpStatus } from '@nestjs/common';
import { BusinessException } from 'src/shared/exceptions/business.exception';

/** 403: só o autor edita; só o autor ou um admin exclui. */
export class SemPermissaoMensagemConversaException extends BusinessException {
  constructor(acao: 'editar' | 'excluir') {
    super(`Você não tem permissão para ${acao} esta mensagem.`, HttpStatus.FORBIDDEN);
  }
}
