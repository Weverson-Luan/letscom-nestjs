import { Global, Module } from '@nestjs/common';
import { RoleUserRepository } from '../repositories/role-user.repository';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, RoleUserRepository],
  exports: [PrismaService, RoleUserRepository],
})
export class PrismaModule {}
