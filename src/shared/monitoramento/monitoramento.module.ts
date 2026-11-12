import { Module } from '@nestjs/common';
import { MonitorMemoriaService } from './monitor-memoria.service';

@Module({ providers: [MonitorMemoriaService] })
export class MonitoramentoModule {}
