import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@suv/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AggregationService } from './aggregation.service';

@Controller('aggregation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OBODONLASHTIRISH_ADMIN)
export class AggregationController {
  constructor(private readonly aggregationService: AggregationService) {}

  @Post('run')
  run(@Query('periodType') periodType?: 'hourly' | 'daily' | 'monthly') {
    return this.aggregationService.runNow(periodType ?? 'daily');
  }
}
