import { Injectable, Logger } from '@nestjs/common';
import { Remessa, User, UserCliente } from '@prisma/client';
import { BusinessException } from 'src/shared/exceptions/business.exception';
import { MailService } from 'src/shared/mail/mail.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { StorageService } from 'src/shared/storage/storage.service';

type RemessaComSolicitantes = Remessa & {
  solicitante?: Pick<User, 'email' | 'nome'> | null;
  solicitanteSubordinado?: Pick<UserCliente, 'email' | 'nome'> | null;
  cliente?: Pick<User, 'nome' | 'email'> | null;
};

type Liberador = Pick<User, 'id' | 'nome'> & { roles?: { nome: string }[] };

const TEMPLATE_BY_TIPO: Record<string, string> = {
  balcao: 'balcao',
  correios: 'correios',
  motoboy_letscom: 'motoboy',
  outros: 'outros',
  transportadora: 'outros',
};

/**
 * Espelha LiberacaoRemessaBalcaoEmailService do Laravel.
 */
@Injectable()
export class LiberacaoRemessaBalcaoEmailService {
  private readonly logger = new Logger(LiberacaoRemessaBalcaoEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly storage: StorageService,
  ) {}

  async enviar(
    remessa: RemessaComSolicitantes,
    liberador: Liberador,
    tipoEntregaId: bigint,
    observacao: string,
    filePath?: string | null,
  ): Promise<void> {
    await this.enviarInterno(remessa, liberador, tipoEntregaId, observacao, filePath, true);
  }

  async enviarSemExcecao(
    remessa: RemessaComSolicitantes,
    liberador: Liberador,
    tipoEntregaId: bigint,
    observacao: string,
    filePath?: string | null,
  ): Promise<void> {
    try {
      await this.enviarInterno(
        remessa,
        liberador,
        tipoEntregaId,
        observacao,
        filePath,
        false,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar e-mail de liberação em lote (balcão): ${(error as Error).message}`,
        { remessa_id: remessa.id, numero_remessa: remessa.numeroRemessa },
      );
    }
  }

  resolverDestinatario(
    remessa: RemessaComSolicitantes,
  ): { email: string; nome: string } | null {
    if (remessa.userIdSolicitanteRemessa) {
      const solicitante = remessa.solicitante;
      if (!solicitante?.email) return null;
      return {
        email: solicitante.email,
        nome: solicitante.nome ?? 'Solicitante',
      };
    }

    if (remessa.usersSolicitanteSubordinadoId) {
      const subordinado = remessa.solicitanteSubordinado;
      if (!subordinado?.email) return null;
      return {
        email: subordinado.email,
        nome: subordinado.nome ?? 'Solicitante',
      };
    }

    return null;
  }

  private async enviarInterno(
    remessa: RemessaComSolicitantes,
    liberador: Liberador,
    tipoEntregaId: bigint,
    observacao: string,
    filePath: string | null | undefined,
    lancarExcecao: boolean,
  ): Promise<void> {
    try {
      const destinatario = this.resolverDestinatario(remessa);
      if (!destinatario) {
        throw new BusinessException('Remessa sem solicitante com e-mail cadastrado.');
      }

      const content = await this.renderEmailTemplate(liberador, tipoEntregaId, observacao);
      const html = this.mail.render('layout-remessa', {
        titulo: `Remessa Nº ${remessa.numeroRemessa}`,
        content,
        ano: new Date().getFullYear(),
      });

      const attachments = await this.prepararAnexo(filePath);

      await this.mail.send({
        to: destinatario.email,
        toName: destinatario.nome,
        subject: `Atualização da sua remessa Nº ${remessa.numeroRemessa}`,
        html,
        text: `Olá ${destinatario.nome}, sua remessa Nº ${remessa.numeroRemessa} foi liberada com sucesso. Acesse o sistema para acompanhar os detalhes.`,
        attachments,
      });
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail (balcão): ${(error as Error).message}`);
      if (lancarExcecao) {
        if (error instanceof BusinessException) throw error;
        throw new BusinessException('Erro ao enviar o e-mail da remessa!');
      }
    }
  }

  private async renderEmailTemplate(
    liberador: Liberador,
    tipoEntregaId: bigint,
    observacao: string,
  ): Promise<string> {
    const tipoEntrega = await this.prisma.tipoEntrega.findUnique({
      where: { id: tipoEntregaId },
    });
    const tipo = (tipoEntrega?.tipo ?? '').toLowerCase();
    const template = TEMPLATE_BY_TIPO[tipo];

    if (!template) {
      throw new BusinessException('Tipo de entrega inválido!');
    }

    const roleNome = liberador.roles?.[0]?.nome;
    const setor = this.formatarSetor(roleNome);
    const mensagemHtml = (observacao ?? '').replace(/\n/g, '<br>');

    return this.mail.render(template, {
      mensagemHtml,
      responsavel: liberador.nome ?? 'Letscom',
      setor,
    });
  }

  private formatarSetor(roleNome?: string | null): string | null {
    if (!roleNome) return null;
    const labels: Record<string, string> = {
      expedicao: 'Expedição',
      Expedicao: 'Expedição',
      producao: 'Produção',
      Producao: 'Produção',
      recepcao: 'Recepção',
      Recepcao: 'Recepção',
    };
    return labels[roleNome] ?? roleNome.charAt(0).toUpperCase() + roleNome.slice(1);
  }

  private async prepararAnexo(
    filePath?: string | null,
  ): Promise<{ filename: string; contentBase64: string }[] | undefined> {
    if (!filePath) return undefined;
    if (!(await this.storage.exists(filePath))) return undefined;

    const buffer = await this.storage.download(filePath);
    if (!buffer) return undefined;

    return [
      {
        filename: filePath.split('/').pop() ?? 'anexo',
        contentBase64: buffer.toString('base64'),
      },
    ];
  }
}
