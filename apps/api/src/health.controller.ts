import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async check() {
    let database = 'ok';
    try {
      await this.db.query('SELECT 1');
    } catch {
      database = 'error';
    }
    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      serverless: !!(process.env.VERCEL || process.env.DISABLE_BACKGROUND_SERVICES),
      time: new Date().toISOString(),
    };
  }
}
