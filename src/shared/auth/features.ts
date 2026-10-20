/**
 * Keys das feature flags usadas na autorização da API — espelham
 * App\Support\Auth\Features do Laravel (e src/utils/auth/features.ts no front).
 *
 * ACESSO A TELA/MENU (navegação): controlam só se o menu lateral do front
 * mostra o item e se a tela principal dele pode ser aberta. Nunca usar estas
 * para liberar uma ação específica dentro da tela — isso é papel das features
 * de funcionalidade.
 */
export const Feature = {
  ACESSAR_BACKOFFICE: 'acessar_backoffice',
  ACESSAR_ADMIN: 'acessar_admin',
  ACESSAR_REMESSAS: 'acessar_remessas',
  ACESSAR_PESQUISAR_REMESSAS: 'acessar_pesquisar_remessas',
  ACESSAR_EXPEDICAO: 'acessar_expedicao',
  ACESSAR_RECEPCAO: 'acessar_recepcao',
  ACESSAR_GERENCIAR_CLIENTE: 'acessar_gerenciar_cliente',
  ACESSAR_MODELOS_CLIENTE: 'acessar_modelos_cliente',
  ACESSAR_REMESSAS_ANDAMENTO: 'acessar_remessas_andamento',
  ACESSAR_HISTORICO_REMESSAS: 'acessar_historico_remessas',
  ACESSAR_CONVERSA_CLIENTE: 'acessar_conversa_cliente',
  ACESSAR_AGENDA_CLIENTE: 'acessar_agenda_cliente',
  ACESSAR_NOTIFICACOES: 'acessar_notificacoes',

  // BACKOFFICE CROPIX
  ACESSAR_ATIVIDADES: 'acessar_atividades',
  ACESSAR_PRODUTOS: 'acessar_produtos',
  ACESSAR_TECNOLOGIAS: 'acessar_tecnologias',
  ACESSAR_FEATURE_FLAGS: 'acessar_feature_flags',

  // CLIENTE
  VISUALIZAR_CLIENTE: 'visualizar_cliente',
  CRIAR_CLIENTE: 'criar_cliente',
  EDITAR_CLIENTE: 'editar_cliente',
  INATIVAR_CLIENTE: 'inativar_cliente',
  GERENCIAR_CREDITOS_CLIENTE: 'gerenciar_creditos_cliente',

  // CONVERSA DO CLIENTE (chat entre a equipe e a empresa do cliente)
  VISUALIZAR_CONVERSA_CLIENTE: 'visualizar_conversa_cliente',
  ENVIAR_MENSAGENS_CONVERSA_CLIENTE: 'enviar_mensagens_conversa_cliente',
  /** Cliente/subordinado: ler e responder a conversa da própria empresa no portal do cliente. */
  RESPONDER_CONVERSA_CLIENTE: 'responder_conversa_cliente',

  // AGENDA DO CLIENTE (compromissos: ligações, reuniões, visitas...)
  VISUALIZAR_AGENDA_CLIENTE: 'visualizar_agenda_cliente',
  GERENCIAR_AGENDA_CLIENTE: 'gerenciar_agenda_cliente',

  // USUARIOS INTERNOS (backoffice: consultor, producao, recepcao)
  GERENCIAR_USUARIOS_INTERNOS: 'gerenciar_usuarios_internos',

  // USUARIO CLIENTE
  VISUALIZAR_USUARIO_CLIENTE: 'visualizar_usuario_cliente',
  CRIAR_USUARIO_CLIENTE: 'criar_usuario_cliente',
  INATIVAR_USUARIO_CLIENTE: 'inativar_usuario_cliente',
  EDITAR_USUARIOS_CLIENTE: 'editar_usuarios_cliente',

  // CREDITOS
  VISUALIZAR_EXTRATO_CREDITO: 'visualizar_extrato_credito',
  VISUALIZAR_COBRANCA_CREDITO: 'visualizar_cobranca_credito',
  CRIAR_CREDITO: 'criar_credito',
  VISUALIZAR_SALDO_CREDITOS: 'visualizar_saldo_creditos',

  // MODELOS TECNICOS
  VISUALIZAR_MODELOS_TECNICOS: 'visualizar_modelos_tecnicos',
  CRIAR_MODELOS_TECNICOS: 'criar_modelos_tecnicos',
  EDITAR_MODELOS_TECNICOS: 'editar_modelos_tecnicos',
  INATIVAR_MODELOS_TECNICOS: 'inativar_modelos_tecnicos',

  // REMESSAS
  PESQUISAR_REMESSAS: 'pesquisar_remessas',
  SOLICITAR_REMESSAS: 'solicitar_remessas',
  DEVOLVER_REMESSAS: 'devolver_remessas',
  LIBERACAO_MULTIPLAS_REMESSAS_BALCAO: 'liberacao_mutiplas_remessas_balcao',
  LIBERACAO_REMESSAS_RECEPCAO: 'liberacao_remessas_recepcao',
  LIBERACAO_MULTIPLAS_REMESSAS_RECEPCAO: 'liberacao_mutiplas_remessa_recepcao',
  LIBERACAO_REMESSA_BALCAO: 'liberacao_remessa_balcao',
  PEGAR_TAREFA_REMESSAS: 'pegar_tarefa_remessas',
  MINHAS_TAREFA_REMESSAS: 'minhas_tarefa_remessas',
  FINALIZAR_TAREFA_REMESSAS: 'finalizar_tarefa_remessas',
  BAIXAR_REMESSAS: 'baixar_remessas',
  ADICIONAR_OBSERVACAO_REMESSAS: 'adicionar_observacao_remessas',
  EXCLUIR_REMESSAS: 'excluir_remessas',
  VISUALIZAR_REMESSAS_ANDAMENTO: 'visualizar_remessas_andamento',
  VISUALIZAR_HISTORICO_REMESSAS: 'visualizar_historico_remessas',
} as const;

export type FeatureKey = (typeof Feature)[keyof typeof Feature];

/** Grupos de features repetidos em várias rotas. */
export const FEATURES_LIBERACAO_BALCAO = [
  Feature.LIBERACAO_REMESSA_BALCAO,
  Feature.LIBERACAO_MULTIPLAS_REMESSAS_BALCAO,
];

export const FEATURES_LIBERACAO_RECEPCAO = [
  Feature.LIBERACAO_REMESSAS_RECEPCAO,
  Feature.LIBERACAO_MULTIPLAS_REMESSAS_RECEPCAO,
];

export const FEATURES_LIBERACAO = [...FEATURES_LIBERACAO_BALCAO, ...FEATURES_LIBERACAO_RECEPCAO];

/** Mensagem padrão de bloqueio por feature (CheckFeature do Laravel). */
export const MENSAGEM_SEM_PERMISSAO = 'Usuário não possui permissão para realizar esta ação.';
