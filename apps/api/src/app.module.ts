import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AggregationModule } from './aggregation/aggregation.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { LinesModule } from './lines/lines.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { MqttModule } from './mqtt/mqtt.module';
import { OpsModule } from './ops/ops.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RegionsModule } from './regions/regions.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';

const isServerless = !!(
  process.env.VERCEL ||
  process.env.DISABLE_BACKGROUND_SERVICES === 'true'
);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ...(isServerless ? [] : [ScheduleModule.forRoot()]),
    DatabaseModule,
    AuthModule,
    RegionsModule,
    LinesModule,
    TicketsModule,
    MonitoringModule,
    OpsModule,
    ReportsModule,
    UsersModule,
    StorageModule,
    ...(isServerless
      ? []
      : [RealtimeModule, MqttModule, AggregationModule]),
  ],
  controllers: [HealthController],
})
export class AppModule {}
