import mqtt from 'mqtt';
import { Pool } from 'pg';
import { mqttTopic, SensorType } from '@suv/shared';

const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://suv:suv_secret@localhost:5433/suv_shaxar';
const INTERVAL_MS = Number(process.env.SIM_INTERVAL_MS ?? 5000);

interface LineRow {
  code: string;
  irrigation_on: boolean;
  status: string;
}

function soilMoisture(hour: number, irrigationOn: boolean): number {
  const base = 35 + 20 * Math.sin(((hour - 6) / 24) * Math.PI * 2);
  const boost = irrigationOn ? 15 : hour >= 18 && hour <= 22 ? 10 : 0;
  const noise = (Math.random() - 0.5) * 4;
  return Math.min(80, Math.max(20, base + boost + noise));
}

function waterFlow(irrigationOn: boolean): number {
  if (!irrigationOn) return Math.random() * 2;
  return 40 + Math.random() * 30;
}

function temperature(hour: number): number {
  const base = 22 + 10 * Math.sin(((hour - 8) / 24) * Math.PI * 2);
  return Math.round((base + (Math.random() - 0.5) * 2) * 10) / 10;
}

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Prevent unhandled pool errors from crashing the process
  pool.on('error', (err) => {
    console.error('\nPostgres pool error (will retry):', err.message);
  });

  const client = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 3000,
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('MQTT connect timeout')),
      15_000,
    );
    client.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    client.on('error', (err) => {
      console.error('MQTT error:', err.message);
    });
  });

  console.log(`IoT Simulator connected to ${MQTT_URL}`);
  console.log(`Publishing every ${INTERVAL_MS}ms to sensors/{line_code}/{type}`);

  let ticking = false;
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      const { rows } = await pool.query<LineRow>(
        `SELECT code, irrigation_on, status
         FROM irrigation_lines
         WHERE status = 'active'`,
      );

      const hour = new Date().getHours();

      for (const line of rows) {
        const readings: { type: SensorType; value: number; unit: string }[] = [
          {
            type: SensorType.SOIL_MOISTURE,
            value: Math.round(soilMoisture(hour, line.irrigation_on) * 10) / 10,
            unit: '%',
          },
          {
            type: SensorType.WATER_FLOW,
            value: Math.round(waterFlow(line.irrigation_on) * 10) / 10,
            unit: 'L/h',
          },
          {
            type: SensorType.TEMPERATURE,
            value: temperature(hour),
            unit: '°C',
          },
        ];

        for (const r of readings) {
          const topic = mqttTopic(line.code, r.type);
          const payload = JSON.stringify({
            value: r.value,
            unit: r.unit,
            recordedAt: new Date().toISOString(),
          });
          client.publish(topic, payload);
        }
      }

      process.stdout.write(
        `\rPublished for ${rows.length} lines @ ${new Date().toLocaleTimeString()}`,
      );
    } catch (err: any) {
      console.error(
        `\nSimulator tick error (retrying): ${err?.message ?? err}`,
      );
    } finally {
      ticking = false;
    }
  };

  await tick();
  setInterval(tick, INTERVAL_MS);
}

main().catch((err) => {
  console.error('Simulator failed:', err);
  process.exit(1);
});
