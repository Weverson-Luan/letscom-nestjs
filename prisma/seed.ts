/**
 * Seed espelhando database/seeders do Laravel (letscom-backend).
 * Ordem alinhada ao DatabaseSeeder + extras úteis (feature flags, cliente↔consultor, users_cliente).
 *
 * Roles em minúsculo para bater com src/shared/constants/roles.ts (Nest RolesGuard).
 * Solicitante123 do legado → role `solicitante` (typo corrigido).
 */
import { PrismaClient, TipoEndereco, TipoEntregaValor } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

/** roles.descricao / feature flags usam VARCHAR(191) no schema Nest. */
function truncate(text: string, max = 191): string {
  return text.length <= max ? text : text.slice(0, max - 1) + '…';
}

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function seedUsersAndRoles() {
  const usuarios: Array<{
    nome: string;
    email: string;
    senha: string;
    role: string;
    descricaoRole: string;
    telefone: string;
    documento: string;
  }> = [
    {
      nome: 'Administrador',
      email: 'admin@example.com',
      senha: 'admin123',
      role: 'admin',
      descricaoRole:
        'Responsável por gerenciar todo o sistema, incluindo usuários, permissões, configurações globais e dados operacionais. Possui acesso irrestrito a todos os recursos da plataforma.',
      telefone: '31999999999',
      documento: '00000000000001',
    },
    {
      nome: 'Tiago Gurgel',
      email: 'tiago@letscom.com',
      senha: 'admin123',
      role: 'admin',
      descricaoRole:
        'Responsável por gerenciar todo o sistema, incluindo usuários, permissões, configurações globais e dados operacionais. Possui acesso irrestrito a todos os recursos da plataforma.',
      telefone: '31988049619',
      documento: '00000000000002',
    },
    {
      nome: 'Leandro Baeta',
      email: 'leandro.baetadev@letscom.com.br',
      senha: 'admin123',
      role: 'consultor',
      descricaoRole:
        'Responsável por realizar vendas, prestar atendimento aos clientes e auxiliar na operação da plataforma. Atua como ponto de contato direto com os clientes, orientando sobre produtos, serviços e funcionalidades disponíveis.',
      telefone: '31988049632',
      documento: '00000000000003',
    },
    {
      nome: 'Junior Sousa',
      email: 'comercial2dev@letscom.com.br',
      senha: 'consultor123',
      role: 'consultor',
      descricaoRole:
        'Responsável por realizar vendas, prestar atendimento aos clientes e auxiliar na operação da plataforma. Atua como ponto de contato direto com os clientes, orientando sobre produtos, serviços e funcionalidades disponíveis.',
      telefone: '31988049642',
      documento: '00000000000004',
    },
    {
      nome: 'WLTECH',
      email: 'wltech2022@gmail.com',
      senha: 'cliente123',
      role: 'cliente',
      descricaoRole: 'Usuário externo com acesso às suas remessas e informações de produção.',
      telefone: '31999999998',
      documento: '00000000000005',
    },
    {
      nome: 'Guilherme Senhorinhe',
      email: 'producao2dev@letscom.com.br',
      senha: 'producao123',
      role: 'producao',
      descricaoRole: 'Responsável por executar tarefas de produção e acompanhar remessas em andamento.',
      telefone: '31999999997',
      documento: '00000000000006',
    },
    {
      nome: 'Clarice Fonseca',
      email: 'atendimentodev@letscom.com.br',
      senha: 'producao123',
      role: 'producao',
      descricaoRole: 'Responsável por executar tarefas de produção e acompanhar remessas em andamento.',
      telefone: '31999999992',
      documento: '00000000000007',
    },
    {
      nome: 'Diane',
      email: 'comercial3dev@letscom.com.br',
      senha: 'recepcao123',
      role: 'recepcao',
      descricaoRole: 'Responsável por dispensar remessas e encaminhá-las para o cliente.',
      telefone: '31999999996',
      documento: '00000000000008',
    },
    {
      nome: 'Ana Amorim',
      email: 'expedicaodev@letscom.com.br',
      senha: 'expedicao123',
      role: 'expedicao',
      descricaoRole: 'Responsável por dispensar remessas e encaminhá-las para recepção.',
      telefone: '31923495796',
      documento: '00000000000009',
    },
    {
      nome: 'Solicitante Remessa',
      email: 'solicitante@example.com',
      senha: 'solicitante',
      role: 'solicitante',
      descricaoRole: 'Responsável por solicitar remessas.',
      telefone: '31999999934',
      documento: '00000000000010',
    },
    {
      nome: 'Subordinado',
      email: 'subordinado@example.com',
      senha: 'subordinado123',
      role: 'subordinado',
      descricaoRole:
        'Usuário vinculado a uma empresa cliente, com acesso limitado para realizar ações em nome da organização. Pode visualizar e solicitar remessas, consultar entregas, e interagir com funcionalidades autorizadas pela empresa principal.',
      telefone: '31937999934',
      documento: '00000000000011',
    },
  ];

  for (const dados of usuarios) {
    const role = await prisma.role.upsert({
      where: { nome: dados.role },
      create: { nome: dados.role, descricao: truncate(dados.descricaoRole) },
      update: { descricao: truncate(dados.descricaoRole) },
    });

    const senhaHash = await hash(dados.senha);
    const user = await prisma.user.upsert({
      where: { email: dados.email },
      create: {
        nome: dados.nome,
        email: dados.email,
        senha: senhaHash,
        documento: dados.documento,
        ativo: true,
        tipoPessoa: 'F',
        telefone: dados.telefone,
      },
      update: {
        nome: dados.nome,
        senha: senhaHash,
        documento: dados.documento,
        ativo: true,
        tipoPessoa: 'F',
        telefone: dados.telefone,
      },
    });

    const existing = await prisma.$queryRaw<{ user_id: bigint }[]>`
      SELECT user_id FROM role_user
      WHERE user_id = ${user.id} AND role_id = ${role.id}
      LIMIT 1
    `;
    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO role_user (user_id, role_id, ativo)
        VALUES (${user.id}, ${role.id}, true)
      `;
    }
  }
}

async function seedEnderecos() {
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' }, take: 5 });
  if (users.length === 0) return;

  const enderecos = [
    {
      logradouro: 'Rua Exemplo',
      numero: '123',
      complemento: 'Sala 5',
      bairro: 'Centro',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      cep: '30130-000',
      tipoEndereco: TipoEndereco.residencial,
      nomeResponsavel: 'Pedro Lucas Silva',
      email: 'pedrolucas@gmail.com',
      setor: 'Juridico',
      telefone: '3197582241',
    },
    {
      logradouro: 'Av. Brasil',
      numero: '198',
      complemento: null as string | null,
      bairro: 'Serra',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      cep: '30140-100',
      tipoEndereco: TipoEndereco.residencial,
      nomeResponsavel: 'Maria Das Dores',
      email: 'mariadores2025@gmail.com',
      setor: 'Administrativo',
      telefone: '31965357842',
    },
    {
      logradouro: 'Av. Portugal',
      numero: '159',
      complemento: null,
      bairro: 'Gameleira',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      cep: '30140-240',
      tipoEndereco: TipoEndereco.residencial,
      nomeResponsavel: 'Elton Souza',
      email: 'eltonsouza@gmail.com',
      setor: 'Financeiro',
      telefone: '31985637659',
    },
    {
      logradouro: 'Av. Dom pedro I',
      numero: '100',
      complemento: null,
      bairro: 'Santa Terezinha',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      cep: '31170-811',
      tipoEndereco: TipoEndereco.residencial,
      nomeResponsavel: 'Mateus Carlos Almeida',
      email: 'mateuscarlos@gmail.com',
      setor: 'Administrativo',
      telefone: '31965357842',
    },
    {
      logradouro: 'Rua Silva Lobo',
      numero: '100',
      complemento: null,
      bairro: 'Jaqueline',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      cep: '32471-438',
      tipoEndereco: TipoEndereco.residencial,
      nomeResponsavel: 'José Pedro Alemida',
      email: 'pedro@gmail.com',
      setor: 'Administrativo',
      telefone: '31965357842',
    },
  ];

  for (let i = 0; i < enderecos.length; i++) {
    const user = users[i];
    if (!user) break;
    const attrs = enderecos[i];
    const existing = await prisma.endereco.findFirst({
      where: {
        userId: user.id,
        logradouro: attrs.logradouro,
        numero: attrs.numero,
      },
    });
    if (existing) {
      await prisma.endereco.update({
        where: { id: existing.id },
        data: { ...attrs, userId: user.id },
      });
    } else {
      await prisma.endereco.create({
        data: { ...attrs, userId: user.id },
      });
    }
  }
}

async function seedTiposEntrega() {
  const tipos: TipoEntregaValor[] = [
    TipoEntregaValor.balcao,
    TipoEntregaValor.correios,
    TipoEntregaValor.motoboy_letscom,
    TipoEntregaValor.outros,
  ];

  for (const tipo of tipos) {
    const existing = await prisma.tipoEntrega.findFirst({ where: { tipo } });
    if (existing) {
      await prisma.tipoEntrega.update({
        where: { id: existing.id },
        data: { ativo: true },
      });
    } else {
      await prisma.tipoEntrega.create({ data: { tipo, ativo: true } });
    }
  }
}

async function seedTipoEntregaUser() {
  const clienteRows = await prisma.$queryRaw<{ id: bigint }[]>`
    SELECT u.id
    FROM users u
    INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
    INNER JOIN roles r ON r.id = ru.role_id
    WHERE LOWER(r.nome) = 'cliente'
    ORDER BY u.id ASC
    LIMIT 2
  `;

  let clientes =
    clienteRows.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: clienteRows.map((row) => row.id) } },
          orderBy: { id: 'asc' },
        })
      : [];

  if (clientes.length < 2) {
    clientes = await prisma.user.findMany({ orderBy: { id: 'asc' }, take: 2 });
  }
  if (clientes.length < 2) {
    console.warn('TipoEntregaUserSeeder: são necessários pelo menos 2 usuários.');
    return;
  }

  const balcao = await prisma.tipoEntrega.findFirst({
    where: { tipo: TipoEntregaValor.balcao },
  });
  const correios = await prisma.tipoEntrega.findFirst({
    where: { tipo: TipoEntregaValor.correios },
  });
  if (!balcao || !correios) return;

  for (const [cliente, tipoEntrega] of [
    [clientes[0], balcao],
    [clientes[1], correios],
  ] as const) {
    const existing = await prisma.tipoEntregaUser.findFirst({
      where: { clienteId: cliente.id, tipoEntregaId: tipoEntrega.id },
    });
    if (!existing) {
      await prisma.tipoEntregaUser.create({
        data: { clienteId: cliente.id, tipoEntregaId: tipoEntrega.id },
      });
    }
  }
}

async function seedProducts() {
  const produtos = [
    { nome: 'SEM CHIP', valor: 15.0, valorCreditos: 1.5, estoqueMinimo: 100, estoqueMaximo: 10000000, estoqueAtual: 500 },
    { nome: 'RFID 125', valor: 15.0, valorCreditos: 1.5, estoqueMinimo: 100, estoqueMaximo: 10000000, estoqueAtual: 500 },
    { nome: 'MIFARE 13,56', valor: 15.0, valorCreditos: 1.5, estoqueMinimo: 100, estoqueMaximo: 10000000, estoqueAtual: 500 },
    { nome: 'HÍBRIDO', valor: 25.0, valorCreditos: 2.5, estoqueMinimo: 50, estoqueMaximo: 10000000, estoqueAtual: 75 },
    { nome: 'TARJA', valor: 25.0, valorCreditos: 2.5, estoqueMinimo: 50, estoqueMaximo: 10000000, estoqueAtual: 75 },
    { nome: 'RFID 125 + TARJA', valor: 45.0, valorCreditos: 4.5, estoqueMinimo: 200, estoqueMaximo: 10000000, estoqueAtual: 1500 },
    { nome: 'MIFARE 13,56 + TARJA', valor: 45.0, valorCreditos: 4.5, estoqueMinimo: 200, estoqueMaximo: 10000000, estoqueAtual: 1500 },
    { nome: 'HÍBRIDO + TARJA', valor: 10.0, valorCreditos: 1.0, estoqueMinimo: 100, estoqueMaximo: 10000000, estoqueAtual: 120 },
  ];

  for (const p of produtos) {
    const existing = await prisma.product.findFirst({ where: { nome: p.nome } });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.product.create({ data: p });
    }
  }
}

async function seedTecnologias() {
  const tecnologias = [
    { nome: 'RFID Mifare 13,56Mhz', descricao: 'Tecnologia de rádio frequência para leitura segura.' },
    { nome: 'RFID 125Khz', descricao: 'Leitura de cartões de baixa frequência.' },
    { nome: 'Tarja Magnética ALTA', descricao: 'Para cartões com alta resistência à leitura.' },
    { nome: 'Tarja Magnética BAIXA', descricao: 'Para cartões com baixa resistência à leitura.' },
    { nome: 'Adesivo', descricao: 'Tecnologia adesiva para cartões ou etiquetas.' },
    { nome: 'Código de Barras', descricao: 'Padrão comum de código de barras em cartões.' },
    { nome: 'Nenhuma Tecnologia', descricao: 'Nenhum tipo de tecnologia para o cartão.' },
  ];

  for (const t of tecnologias) {
    await prisma.tecnologia.upsert({
      where: { nome: t.nome },
      create: { ...t, ativo: true },
      update: { descricao: t.descricao, ativo: true },
    });
  }
}

async function seedModelosTecnicos() {
  const cliente =
    (await prisma.user.findUnique({ where: { email: 'wltech2022@gmail.com' } })) ??
    (await prisma.user.findFirst({ orderBy: { id: 'asc' } }));
  if (!cliente) {
    console.warn('ModelosTecnicosSeeder: nenhum usuário encontrado.');
    return;
  }

  const produto =
    (await prisma.product.findFirst({ where: { nome: 'SEM CHIP' } })) ??
    (await prisma.product.findFirst({ orderBy: { id: 'asc' } }));
  const tecnologia =
    (await prisma.tecnologia.findUnique({ where: { nome: 'Nenhuma Tecnologia' } })) ??
    (await prisma.tecnologia.findFirst({ orderBy: { id: 'asc' } }));

  if (!produto || !tecnologia) {
    console.warn('ModelosTecnicosSeeder: produtos ou tecnologias vazios.');
    return;
  }

  const modelos = [
    {
      nomeModelo: 'Visitante WLTECH',
      isProvisorio: true,
      temDadosVariaveis: false,
      temCargaFoto: false,
      campoChave: 'cpf',
      observacoes: 'Modelo provisório de exemplo para WLTECH (sem planilha/fotos).',
    },
    {
      nomeModelo: 'Colaborador WLTECH',
      isProvisorio: false,
      temDadosVariaveis: true,
      temCargaFoto: true,
      campoChave: 'matricula',
      observacoes: 'Modelo definitivo de exemplo para WLTECH (com dados variáveis e fotos).',
    },
  ];

  for (const m of modelos) {
    const existing = await prisma.modeloTecnico.findFirst({
      where: { clienteId: cliente.id, nomeModelo: m.nomeModelo },
    });
    const data = {
      produtoId: produto.id,
      tecnologiaId: tecnologia.id,
      posicionamento: 'horizontal' as const,
      temFuro: false,
      temCargaFoto: m.temCargaFoto,
      temDadosVariaveis: m.temDadosVariaveis,
      isProvisorio: m.isProvisorio,
      campoChave: m.campoChave,
      fotoFrentePath: null,
      fotoVersoPath: null,
      observacoes: m.observacoes,
      ativo: true,
    };
    if (existing) {
      await prisma.modeloTecnico.update({ where: { id: existing.id }, data });
    } else {
      await prisma.modeloTecnico.create({
        data: { ...data, clienteId: cliente.id, nomeModelo: m.nomeModelo },
      });
    }
  }
}

async function seedModelosTecnicosCamposVariaveis() {
  const modelo = await prisma.modeloTecnico.findFirst({
    where: { nomeModelo: 'Colaborador WLTECH' },
  });
  if (!modelo) {
    console.warn('ModelosTecnicosCamposVariaveisSeeder: modelo Colaborador WLTECH não encontrado.');
    return;
  }

  const campos = [
    { nome: 'matricula', obrigatorio: true, ordem: 1 },
    { nome: 'nome', obrigatorio: true, ordem: 2 },
    { nome: 'cpf', obrigatorio: false, ordem: 3 },
  ];

  for (const c of campos) {
    const existing = await prisma.modeloTecnicoCampoVariavel.findFirst({
      where: { modeloTecnicoId: modelo.id, nome: c.nome },
    });
    if (existing) {
      await prisma.modeloTecnicoCampoVariavel.update({
        where: { id: existing.id },
        data: { obrigatorio: c.obrigatorio, ordem: c.ordem },
      });
    } else {
      await prisma.modeloTecnicoCampoVariavel.create({
        data: {
          modeloTecnicoId: modelo.id,
          nome: c.nome,
          obrigatorio: c.obrigatorio,
          ordem: c.ordem,
        },
      });
    }
  }
}

async function requireUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`UserSeeder deve criar o usuário com e-mail ${email} antes do RemessaSeeder.`);
  }
  return user;
}

async function requireModelo(nomeModelo: string) {
  const modelo = await prisma.modeloTecnico.findFirst({ where: { nomeModelo } });
  if (!modelo) {
    throw new Error(`ModelosTecnicosSeeder deve criar o modelo ${nomeModelo} antes do RemessaSeeder.`);
  }
  return modelo;
}

async function seedRemessas() {
  const tecnologia =
    (await prisma.tecnologia.findUnique({ where: { nome: 'Nenhuma Tecnologia' } })) ??
    (await prisma.tecnologia.findFirst({ orderBy: { id: 'asc' } }));
  const modeloPadrao = await prisma.modeloTecnico.findFirst({ orderBy: { id: 'asc' } });

  if (!modeloPadrao || !tecnologia) {
    console.warn('RemessaSeeder: modelos_tecnicos ou tecnologias vazios.');
    return;
  }

  const now = new Date();
  const executor = await requireUser('producao2dev@letscom.com.br');
  const visitante = await requireModelo('Visitante WLTECH');
  const colaborador = await requireModelo('Colaborador WLTECH');

  const linhas = [
    {
      numeroRemessa: BigInt(50000),
      clienteId: (await requireUser('tiago@letscom.com')).id,
      userIdSolicitanteRemessa: (await requireUser('solicitante@example.com')).id,
      consultorId: (await requireUser('leandro.baetadev@letscom.com.br')).id,
      userIdExecutor: null as bigint | null,
      modeloTecnicoId: modeloPadrao.id,
      tecnologiaId: tecnologia.id,
      totalSolicitacoes: 10,
      situacao: 'solicitado' as const,
      status: 'envio_de_dados',
      observacao: null as string | null,
      dataInicioProducao: null as Date | null,
      posicao: 'H' as const,
    },
    {
      numeroRemessa: BigInt(50001),
      clienteId: (await requireUser('admin@example.com')).id,
      userIdSolicitanteRemessa: (await requireUser('solicitante@example.com')).id,
      consultorId: (await requireUser('comercial2dev@letscom.com.br')).id,
      userIdExecutor: null,
      modeloTecnicoId: modeloPadrao.id,
      tecnologiaId: tecnologia.id,
      totalSolicitacoes: 5,
      situacao: 'solicitado' as const,
      status: 'envio_de_dados',
      observacao: null,
      dataInicioProducao: null,
      posicao: 'H' as const,
    },
    {
      numeroRemessa: BigInt(50010),
      clienteId: (await requireUser('wltech2022@gmail.com')).id,
      userIdSolicitanteRemessa: (await requireUser('wltech2022@gmail.com')).id,
      consultorId: (await requireUser('leandro.baetadev@letscom.com.br')).id,
      userIdExecutor: executor.id,
      modeloTecnicoId: visitante.id,
      tecnologiaId: tecnologia.id,
      totalSolicitacoes: 20,
      situacao: 'em_producao' as const,
      status: 'em_producao',
      observacao: 'Remessa provisória WLTECH (download bloqueado).',
      dataInicioProducao: now,
      posicao: 'H' as const,
    },
    {
      numeroRemessa: BigInt(50011),
      clienteId: (await requireUser('wltech2022@gmail.com')).id,
      userIdSolicitanteRemessa: (await requireUser('wltech2022@gmail.com')).id,
      consultorId: (await requireUser('leandro.baetadev@letscom.com.br')).id,
      userIdExecutor: executor.id,
      modeloTecnicoId: colaborador.id,
      tecnologiaId: tecnologia.id,
      totalSolicitacoes: 15,
      situacao: 'em_producao' as const,
      status: 'em_producao',
      observacao: 'Remessa definitiva WLTECH (download habilitado).',
      dataInicioProducao: now,
      posicao: 'H' as const,
    },
  ];

  for (const linha of linhas) {
    await prisma.remessa.upsert({
      where: { numeroRemessa: linha.numeroRemessa },
      create: { ...linha, ativo: true },
      update: { ...linha, ativo: true },
    });
  }
}

async function seedRemessaFotos() {
  const remessa = await prisma.remessa.findFirst({ orderBy: { id: 'asc' } });
  if (remessa) {
    const existing = await prisma.remessaFoto.findFirst({
      where: { remessaId: remessa.id, matricula: '12345' },
    });
    const data = {
      clienteId: remessa.clienteId,
      filePath: `remessas/fotos/${remessa.id}/foto1.jpg`,
      nome: 'Luan Dev',
    };
    if (existing) {
      await prisma.remessaFoto.update({ where: { id: existing.id }, data });
    } else {
      await prisma.remessaFoto.create({
        data: { ...data, remessaId: remessa.id, matricula: '12345' },
      });
    }
  }

  const remessaWltech = await prisma.remessa.findUnique({
    where: { numeroRemessa: BigInt(50011) },
  });
  if (!remessaWltech) {
    console.warn('RemessaFotosSeeder: remessa WLTECH 50011 não encontrada.');
    return;
  }

  const fotos = [
    { matricula: '1001', nome: 'Ana WLTECH', filePath: `remessas/fotos/${remessaWltech.id}/ana-wltech.jpg` },
    { matricula: '1002', nome: 'Bruno WLTECH', filePath: `remessas/fotos/${remessaWltech.id}/bruno-wltech.jpg` },
  ];

  for (const foto of fotos) {
    const existing = await prisma.remessaFoto.findFirst({
      where: { remessaId: remessaWltech.id, matricula: foto.matricula },
    });
    if (existing) {
      await prisma.remessaFoto.update({
        where: { id: existing.id },
        data: {
          clienteId: remessaWltech.clienteId,
          filePath: foto.filePath,
          nome: foto.nome,
        },
      });
    } else {
      await prisma.remessaFoto.create({
        data: {
          remessaId: remessaWltech.id,
          clienteId: remessaWltech.clienteId,
          matricula: foto.matricula,
          filePath: foto.filePath,
          nome: foto.nome,
        },
      });
    }
  }
}

async function seedCreditSales() {
  const clienteA = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  const clienteB = await prisma.user.findUnique({ where: { email: 'wltech2022@gmail.com' } });
  const executor = await prisma.user.findUnique({ where: { email: 'tiago@letscom.com' } });
  const produto = await prisma.product.findFirst({ orderBy: { id: 'asc' } });

  if (!clienteA || !executor || !produto) {
    console.warn('CreditSaleSeeder: usuários ou produto ausentes.');
    return;
  }

  const clienteVenda2 = clienteB ?? clienteA;

  const venda1 = await prisma.creditSale.findFirst({
    where: { clienteId: clienteA.id, observacao: 'Venda inicial de créditos' },
  });
  const data1 = {
    produtoId: produto.id,
    userIdExecutor: executor.id,
    tipoTransacao: 'entrada' as const,
    valor: 2.25,
    quantidadeCreditos: 15,
    valorTotal: 27,
    status: 'confirmado' as const,
    dataVenda: new Date(),
  };
  if (venda1) {
    await prisma.creditSale.update({ where: { id: venda1.id }, data: data1 });
  } else {
    await prisma.creditSale.create({
      data: {
        ...data1,
        clienteId: clienteA.id,
        observacao: 'Venda inicial de créditos',
      },
    });
  }

  const venda2 = await prisma.creditSale.findFirst({
    where: {
      clienteId: clienteVenda2.id,
      observacao: 'Aguardando confirmação de pagamento',
    },
  });
  const data2 = {
    produtoId: produto.id,
    userIdExecutor: executor.id,
    tipoTransacao: 'saida' as const,
    valor: 1.89,
    quantidadeCreditos: 10,
    valorTotal: 18.9,
    status: 'pendente' as const,
    dataVenda: daysAgo(1),
  };
  if (venda2) {
    await prisma.creditSale.update({ where: { id: venda2.id }, data: data2 });
  } else {
    await prisma.creditSale.create({
      data: {
        ...data2,
        clienteId: clienteVenda2.id,
        observacao: 'Aguardando confirmação de pagamento',
      },
    });
  }
}

async function seedRemessaResponsabilidade() {
  const clienteRows = await prisma.$queryRaw<{ id: bigint }[]>`
    SELECT u.id
    FROM users u
    INNER JOIN role_user ru ON ru.user_id = u.id AND ru.ativo = 1
    INNER JOIN roles r ON r.id = ru.role_id
    WHERE LOWER(r.nome) = 'cliente'
    ORDER BY u.id ASC
  `;
  const clientes =
    clienteRows.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: clienteRows.map((row) => row.id) } },
          orderBy: { id: 'asc' },
        })
      : [];

  if (clientes.length === 0) {
    console.warn('Nenhum cliente encontrado. Execute o UserSeeder primeiro.');
    return;
  }

  const responsabilidades = [
    {
      clienteId: clientes[0].id,
      ativo: true,
      nome: 'José da Silva',
      documento: '12345678901',
      dataCiencia: daysAgo(30),
    },
    {
      clienteId: clientes[0].id,
      ativo: true,
      nome: 'Maria Souza',
      documento: '98765432100',
      dataCiencia: daysAgo(15),
    },
  ];

  if (clientes.length > 1) {
    responsabilidades.push({
      clienteId: clientes[1].id,
      ativo: true,
      nome: 'Carlos Pereira',
      documento: '11223344556',
      dataCiencia: daysAgo(7),
    });
  }

  for (const r of responsabilidades) {
    const existing = await prisma.remessaResponsabilidade.findFirst({
      where: { clienteId: r.clienteId, documento: r.documento },
    });
    if (existing) {
      await prisma.remessaResponsabilidade.update({
        where: { id: existing.id },
        data: r,
      });
    } else {
      await prisma.remessaResponsabilidade.create({ data: r });
    }
  }
}

async function seedFeatureFlags() {
  const flags = [
    {
      key: 'backoffice_dashboard',
      nome: 'Backoffice Dashboard',
      descricao: 'Interface renovada do painel principal.',
    },
    {
      key: 'beta_reports',
      nome: 'Relatórios Beta',
      descricao: 'Relatórios experimentais em fase de testes.',
    },
    {
      key: 'ai_crop',
      nome: 'Recorte com IA',
      descricao: 'Processamento automático de imagens com inteligência artificial.',
    },
    {
      key: 'zip_import',
      nome: 'Importação ZIP',
      descricao: 'Importação em lote de arquivos compactados.',
    },
    {
      key: 'admin_tools',
      nome: 'Ferramentas Admin',
      descricao: 'Utilitários avançados para administradores.',
    },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: { ...flag, ativo: false },
      update: { nome: flag.nome, descricao: flag.descricao, ativo: false },
    });
  }
}

async function seedClienteConsultor() {
  const vinculos = [
    { cliente: 'admin@example.com', consultor: 'leandro.baetadev@letscom.com.br' },
    { cliente: 'wltech2022@gmail.com', consultor: 'leandro.baetadev@letscom.com.br' },
    { cliente: 'tiago@letscom.com', consultor: 'comercial2dev@letscom.com.br' },
  ];

  for (const v of vinculos) {
    const cliente = await prisma.user.findUnique({ where: { email: v.cliente } });
    const consultor = await prisma.user.findUnique({ where: { email: v.consultor } });
    if (!cliente || !consultor) {
      console.warn(`ClienteConsultorSeeder: usuário não encontrado para ${v.cliente} / ${v.consultor}`);
      continue;
    }
    await prisma.clienteConsultor.upsert({
      where: {
        clienteId_consultorId: {
          clienteId: cliente.id,
          consultorId: consultor.id,
        },
      },
      create: { clienteId: cliente.id, consultorId: consultor.id },
      update: {},
    });
  }
}

async function seedUsuarioCliente() {
  const clienteTiago = await prisma.user.findUnique({ where: { email: 'tiago@letscom.com' } });
  const clienteAdmin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });

  if (!clienteTiago || !clienteAdmin) {
    console.warn('UsuarioClienteSeeder: execute o UserSeeder antes.');
    return;
  }

  const senhaHash = await hash('cliente123');

  await prisma.userCliente.upsert({
    where: { email: 'marlon.atendimento@example.com' },
    create: {
      clienteId: clienteTiago.id,
      email: 'marlon.atendimento@example.com',
      nome: 'Marlon da Silva',
      senha: senhaHash,
      documento: '148766598634',
      ativo: true,
    },
    update: {
      clienteId: clienteTiago.id,
      nome: 'Marlon da Silva',
      senha: senhaHash,
      documento: '148766598634',
      ativo: true,
    },
  });

  await prisma.userCliente.upsert({
    where: { email: 'maria.atendimento@example.com' },
    create: {
      clienteId: clienteAdmin.id,
      email: 'maria.atendimento@example.com',
      nome: 'Maria Souza',
      senha: senhaHash,
      documento: '12097387489',
      ativo: true,
    },
    update: {
      clienteId: clienteAdmin.id,
      nome: 'Maria Souza',
      senha: senhaHash,
      documento: '12097387489',
      ativo: true,
    },
  });
}

async function main() {
  console.log('Seeding (legado Laravel → Nest/Prisma)...');

  await seedUsersAndRoles();
  await seedEnderecos();
  await seedTiposEntrega();
  await seedTipoEntregaUser();
  await seedProducts();
  await seedTecnologias();
  await seedModelosTecnicos();
  await seedModelosTecnicosCamposVariaveis();
  await seedRemessas();
  await seedRemessaFotos();
  await seedCreditSales();
  await seedRemessaResponsabilidade();

  // Extras do legado (não estavam no DatabaseSeeder.call, mas existem e são úteis)
  await seedFeatureFlags();
  await seedClienteConsultor();
  await seedUsuarioCliente();

  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
