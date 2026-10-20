import { ConversaMensagemAutorTipo } from '@prisma/client';
import {
  cortarTexto,
  DadosNotificacao,
  TIPOS_NOTIFICACAO,
} from 'src/modules/notificacoes/notificacoes.constants';
import {
  LadoConversa,
  montarLinkConversaInterno,
  LINK_MINHA_CONVERSA,
} from '../../conversas-clientes.constants';

const TAMANHO_TRECHO = 140;

type Parametros = {
  mensagemId: bigint;
  clienteId: bigint;
  /** null quando o cliente não foi encontrado (usa "Cliente"). */
  clienteNome: string | null;
  autorTipo: ConversaMensagemAutorTipo;
  autorNome: string;
  conteudo: string;
  quantidadeAnexos: number;
  /** Lado de quem recebe; padrão: o lado oposto ao do autor. */
  destino?: LadoConversa;
};

function montarTrecho(conteudo: string, quantidadeAnexos: number): string {
  const texto = conteudo.replace(/\s+/g, ' ').trim();
  if (texto) return cortarTexto(texto, TAMANHO_TRECHO);
  return quantidadeAnexos === 1 ? 'Enviou 1 anexo.' : `Enviou ${quantidadeAnexos} anexos.`;
}

/**
 * Texto e link da notificação conforme o lado de quem recebe: o lado do cliente abre
 * /minha-conversa; a equipe abre a tela do cliente.
 */
export function montarNotificacaoMensagem(parametros: Parametros): DadosNotificacao {
  const trecho = montarTrecho(parametros.conteudo, parametros.quantidadeAnexos);
  const autorInterno = parametros.autorTipo === 'interno';
  const destino = parametros.destino ?? (autorInterno ? 'cliente' : 'interno');
  const clienteNome = parametros.clienteNome ?? 'Cliente';

  if (destino === 'cliente') {
    return {
      tipo: TIPOS_NOTIFICACAO.MENSAGEM_CONVERSA,
      titulo: autorInterno ? 'Nova mensagem da equipe Letscom' : 'Nova mensagem na conversa',
      mensagem: `${parametros.autorNome}: ${trecho}`,
      link: LINK_MINHA_CONVERSA,
      conversaMensagemId: parametros.mensagemId,
    };
  }

  return {
    tipo: TIPOS_NOTIFICACAO.MENSAGEM_CONVERSA,
    titulo: autorInterno
      ? `Nova mensagem na conversa com ${clienteNome}`
      : `${clienteNome} respondeu`,
    mensagem: `${parametros.autorNome}: ${trecho}`,
    link: montarLinkConversaInterno(parametros.clienteId),
    conversaMensagemId: parametros.mensagemId,
  };
}
