import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  IsUUID,
} from 'class-validator';
import { JwtPayload, UserRole } from '@suv/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OpsService } from './ops.service';

class BulkIrrigationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  lineIds!: string[];

  @IsBoolean()
  irrigationOn!: boolean;
}

class CreateSensorDto {
  @IsUUID()
  lineId!: string;

  @IsIn(['soil_moisture', 'water_flow', 'temperature'])
  type!: string;

  @IsString()
  serialNumber!: string;
}

@Controller('ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OBODONLASHTIRISH_ADMIN, UserRole.OBODONLASHTIRISH_OPERATOR)
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get('overview')
  overview() {
    return this.opsService.getOverview();
  }

  @Get('sensors')
  sensors(@Query('lineId') lineId?: string) {
    return this.opsService.getSensors(lineId);
  }

  @Post('sensors')
  createSensor(@Body() dto: CreateSensorDto) {
    return this.opsService.createSensor(dto);
  }

  @Get('alerts')
  alerts() {
    return this.opsService.getAlerts();
  }

  @Get('programs')
  programs() {
    return this.opsService.getPrograms();
  }

  @Get('map-lines')
  mapLines() {
    return this.opsService.getLineHealthMap();
  }

  @Post('bulk-irrigation')
  bulk(
    @Body() dto: BulkIrrigationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.opsService.bulkIrrigation(dto.lineIds, dto.irrigationOn, user.sub);
  }
}
