import { ClienteAnotacaoAutorTipo } from '@prisma/client';
import {
  cortarTexto,
  DadosNotificacao,
  TIPOS_NOTIFICACAO,
} from 'src/modules/notificacoes/notificacoes.constants';
import {
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
};

function montarTrecho(conteudo: string, quantidadeAnexos: number): string {
  const texto = conteudo.replace(/\s+/g, ' ').trim();
  if (texto) return cortarTexto(texto, TAMANHO_TRECHO);
  return quantidadeAnexos === 1 ? 'Enviou 1 anexo.' : `Enviou ${quantidadeAnexos} anexos.`;
}

/** Texto e link da notificação: equipe → cliente abre /minhas-anotacoes; cliente → equipe abre o cliente. */
export function montarNotificacaoAnotacao(parametros: Parametros): DadosNotificacao {
  const trecho = montarTrecho(parametros.conteudo, parametros.quantidadeAnexos);

  if (parametros.autorTipo === 'interno') {
    return {
      tipo: TIPOS_NOTIFICACAO.ANOTACAO_CLIENTE,
      titulo: 'Nova mensagem da equipe Letscom',
      mensagem: `${parametros.autorNome}: ${trecho}`,
      link: LINK_MINHAS_ANOTACOES,
      anotacaoId: parametros.anotacaoId,
    };
  }

  return {
    tipo: TIPOS_NOTIFICACAO.ANOTACAO_CLIENTE,
    titulo: `${parametros.clienteNome ?? 'Cliente'} respondeu`,
    mensagem: `${parametros.autorNome}: ${trecho}`,
    link: montarLinkAnotacoesInterno(parametros.clienteId),
    anotacaoId: parametros.anotacaoId,
  };
}
