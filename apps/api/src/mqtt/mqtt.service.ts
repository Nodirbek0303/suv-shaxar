import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt, { MqttClient } from 'mqtt';
import { SensorReadingPayload, SensorType } from '@suv/shared';
import { DatabaseService } from '../database/database.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client!: MqttClient;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('MQTT_URL', 'mqtt://localhost:1883');
    this.client = mqtt.connect(url);

    this.client.on('connect', () => {
      this.logger.log(`MQTT connected: ${url}`);
      this.client.subscribe('sensors/+/+', (err) => {
        if (err) this.logger.error('MQTT subscribe error', err);
        else this.logger.log('Subscribed to sensors/+/+');
      });
    });

    this.client.on('message', (topic, payload) => {
      void this.handleMessage(topic, payload.toString());
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.client?.end(true);
  }

  private async handleMessage(topic: string, raw: string) {
    // sensors/{line_code}/{sensor_type}
    const parts = topic.split('/');
    if (parts.length !== 3 || parts[0] !== 'sensors') return;

    const lineCode = parts[1];
    const sensorType = parts[2] as SensorType;

    let body: { value: number; unit?: string; recordedAt?: string };
    try {
      body = JSON.parse(raw);
    } catch {
      this.logger.warn(`Invalid MQTT payload on ${topic}`);
      return;
    }

    const sensor = await this.db.one<{ id: string }>(
      `SELECT s.id
       FROM sensors s
       JOIN irrigation_lines l ON l.id = s.line_id
       WHERE l.code = $1 AND s.type = $2`,
      [lineCode, sensorType],
    );

    if (!sensor) {
      this.logger.debug(`Unknown sensor: ${lineCode}/${sensorType}`);
      return;
    }

    const recordedAt = body.recordedAt ?? new Date().toISOString();
    const unit =
      body.unit ??
      (sensorType === SensorType.SOIL_MOISTURE
        ? '%'
        : sensorType === SensorType.WATER_FLOW
          ? 'L/h'
          : '°C');

    await this.db.query(
      `INSERT INTO sensor_readings (sensor_id, value, unit, recorded_at)
       VALUES ($1, $2, $3, $4)`,
      [sensor.id, body.value, unit, recordedAt],
    );

    await this.db.query(
      `UPDATE sensors SET last_seen_at = $2 WHERE id = $1`,
      [sensor.id, recordedAt],
    );

    const payload: SensorReadingPayload = {
      lineCode,
      sensorType,
      value: body.value,
      unit,
      recordedAt,
    };

    this.realtime.emitSensorReading(payload);
  }
}
