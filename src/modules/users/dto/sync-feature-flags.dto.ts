import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, ValidateNested } from 'class-validator';

export class FeatureFlagItemDto {
  @ApiProperty()
  @IsInt()
  feature_flag_id!: number;

  @ApiProperty()
  @IsBoolean()
  ativo!: boolean;
}

/** Espelha o SyncUserFeatureFlagsRequest do Laravel. */
export class SyncFeatureFlagsDto {
  @ApiProperty({ type: [FeatureFlagItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureFlagItemDto)
  flags!: FeatureFlagItemDto[];
}
