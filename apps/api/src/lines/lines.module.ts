import { Module } from '@nestjs/common';
import { AuditService } from '../common/audit.service';
import { LinesController } from './lines.controller';
import { LinesService } from './lines.service';

@Module({
  controllers: [LinesController],
  providers: [LinesService, AuditService],
  exports: [LinesService],
})
export class LinesModule {}
