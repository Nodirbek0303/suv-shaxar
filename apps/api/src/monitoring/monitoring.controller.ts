import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PeriodType, UserRole } from '@suv/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MonitoringService } from './monitoring.service';

/**
 * Hokimiyat panel API — aggregated data only.
 */
@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HOKIMIYAT_VIEWER)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('overview')
  overview(@Query('regionId') regionId?: string) {
    return this.monitoringService.getOverview(regionId);
  }

  @Get('overview/today')
  today(@Query('regionId') regionId?: string) {
    return this.monitoringService.getTodayOverview(regionId);
  }

  @Get('regions')
  regions() {
    return this.monitoringService.getRegionComparison();
  }

  @Get('regions/:id')
  regionDetail(@Param('id') id: string) {
    return this.monitoringService.getRegionDetail(id);
  }

  @Get('trends')
  trends(
    @Query('regionId') regionId?: string,
    @Query('periodType') periodType?: PeriodType,
    @Query('days') days?: string,
  ) {
    return this.monitoringService.getTrends(
      regionId,
      periodType ?? PeriodType.DAILY,
      days ? Number(days) : 30,
    );
  }

  @Get('lines')
  lines(
    @Query('regionId') regionId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.monitoringService.getLines({
      regionId,
      q,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      sort,
    });
  }

  @Get('lines/:id')
  lineDetail(@Param('id') id: string) {
    return this.monitoringService.getLineDetail(id);
  }

  @Get('plant-health')
  plantHealth(@Query('regionId') regionId?: string) {
    return this.monitoringService.getPlantHealth(regionId);
  }

  @Get('water-savings')
  waterSavings(
    @Query('regionId') regionId?: string,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly' | 'yearly',
    @Query('days') days?: string,
  ) {
    return this.monitoringService.getWaterSavings({
      regionId,
      period,
      days: days ? Number(days) : undefined,
    });
  }
}
