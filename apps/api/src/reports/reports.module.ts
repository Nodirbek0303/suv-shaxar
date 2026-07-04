import { Module } from '@nestjs/common';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [MonitoringModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
