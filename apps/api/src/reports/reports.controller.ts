import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UserRole } from '@suv/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HOKIMIYAT_VIEWER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('excel')
  async excel(@Query('regionId') regionId: string | undefined, @Res() res: Response) {
    const buffer = await this.reportsService.exportExcel(regionId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="sugorish-hisobot.xlsx"',
    );
    res.send(buffer);
  }

  @Get('pdf')
  async pdf(@Query('regionId') regionId: string | undefined, @Res() res: Response) {
    const buffer = await this.reportsService.exportPdf(regionId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="sugorish-hisobot.pdf"',
    );
    res.send(buffer);
  }
}
