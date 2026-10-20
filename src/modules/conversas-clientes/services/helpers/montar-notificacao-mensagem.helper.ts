import { ClienteAnotacaoAutorTipo } from '@prisma/client';
import {
  cortarTexto,
  DadosNotificacao,
  TIPOS_NOTIFICACAO,
} from 'src/modules/notificacoes/notificacoes.constants';
import {
  LadoConversa,
  montarLinkAnotacoesInterno,
  LINK_MINHAS_ANOTACOES,
} from '../../clientes-anotacoes.constants';

const TAMANHO_TRECHO = 140;

type Parametros = {
  anotacaoId: bigint;
  clienteId: bigint;
  /** null quando o cliente não foi encontrado (usa "Cliente"). */
  clienteNome: string | null;
  autorTipo: ClienteAnotacaoAutorTipo;
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
 * /minhas-anotacoes; a equipe abre a tela do cliente.
 */
export function montarNotificacaoAnotacao(parametros: Parametros): DadosNotificacao {
  const trecho = montarTrecho(parametros.conteudo, parametros.quantidadeAnexos);
  const autorInterno = parametros.autorTipo === 'interno';
  const destino = parametros.destino ?? (autorInterno ? 'cliente' : 'interno');
  const clienteNome = parametros.clienteNome ?? 'Cliente';

  if (destino === 'cliente') {
    return {
      tipo: TIPOS_NOTIFICACAO.ANOTACAO_CLIENTE,
      titulo: autorInterno ? 'Nova mensagem da equipe Letscom' : 'Nova mensagem na conversa',
      mensagem: `${parametros.autorNome}: ${trecho}`,
      link: LINK_MINHAS_ANOTACOES,
      anotacaoId: parametros.anotacaoId,
    };
  }

  return {
    tipo: TIPOS_NOTIFICACAO.ANOTACAO_CLIENTE,
    titulo: autorInterno
      ? `Nova mensagem na conversa com ${clienteNome}`
      : `${clienteNome} respondeu`,
    mensagem: `${parametros.autorNome}: ${trecho}`,
    link: montarLinkAnotacoesInterno(parametros.clienteId),
    anotacaoId: parametros.anotacaoId,
  };
}
