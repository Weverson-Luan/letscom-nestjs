/**
 * IMPORTS
 */

import { Global, Module } from '@nestjs/common';

// services
import { HashService } from './hash.service';
import { ImageService } from './image.service';
import { SpreadsheetService } from './spreadsheet.service';
import { ZipService } from './zip.service';

@Global()
@Module({
  providers: [ImageService, ZipService, SpreadsheetService, HashService],
  exports: [ImageService, ZipService, SpreadsheetService, HashService],
})

/**
 * EXPORT
 */
export class UtilsModule {}
