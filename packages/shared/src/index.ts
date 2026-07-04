export enum UserRole {
  OBODONLASHTIRISH_ADMIN = 'obodonlashtirish_admin',
  OBODONLASHTIRISH_OPERATOR = 'obodonlashtirish_operator',
  HOKIMIYAT_VIEWER = 'hokimiyat_viewer',
}

export enum RegionLevel {
  VILOYAT = 'viloyat',
  TUMAN = 'tuman',
  SHAHAR = 'shahar',
  MAHALLA = 'mahalla',
}

export enum LineStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

export enum SensorType {
  SOIL_MOISTURE = 'soil_moisture',
  WATER_FLOW = 'water_flow',
  TEMPERATURE = 'temperature',
}

export enum PeriodType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  MONTHLY = 'monthly',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}

export enum IrrigationMode {
  MANUAL = 'manual',
  AUTO = 'auto',
}

export enum PlantHealthLevel {
  GOOD = 'good',
  AVERAGE = 'average',
  POOR = 'poor',
}

export const OPERATOR_ROLES = [
  UserRole.OBODONLASHTIRISH_ADMIN,
  UserRole.OBODONLASHTIRISH_OPERATOR,
] as const;

export const MONITORING_ROLES = [UserRole.HOKIMIYAT_VIEWER] as const;

export function plantHealthFromScore(score: number): PlantHealthLevel {
  if (score >= 70) return PlantHealthLevel.GOOD;
  if (score >= 40) return PlantHealthLevel.AVERAGE;
  return PlantHealthLevel.POOR;
}

export function plantHealthColor(level: PlantHealthLevel): string {
  switch (level) {
    case PlantHealthLevel.GOOD:
      return '#22c55e';
    case PlantHealthLevel.AVERAGE:
      return '#eab308';
    case PlantHealthLevel.POOR:
      return '#ef4444';
  }
}

/** MQTT topic: sensors/{line_code}/{sensor_type} */
export function mqttTopic(lineCode: string, sensorType: SensorType | string): string {
  return `sensors/${lineCode}/${sensorType}`;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  regionId: string | null;
  fullName: string;
}

export interface SensorReadingPayload {
  lineCode: string;
  sensorType: SensorType;
  value: number;
  unit: string;
  recordedAt: string;
}

export const SAMARKAND_CENTER = {
  lat: 39.6542,
  lng: 66.9597,
  zoom: 10,
} as const;
