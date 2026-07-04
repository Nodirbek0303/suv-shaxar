import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@suv/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateLineDto,
  IrrigationControlDto,
  UpdateLineDto,
} from './dto/line.dto';
import { LinesService } from './lines.service';

@Controller('lines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LinesController {
  constructor(private readonly linesService: LinesService) {}

  @Get()
  findAll(@Query('regionId') regionId?: string) {
    return this.linesService.findAll(regionId);
  }

  @Get(':id')
  @Roles(UserRole.OBODONLASHTIRISH_ADMIN, UserRole.OBODONLASHTIRISH_OPERATOR)
  findOne(@Param('id') id: string) {
    return this.linesService.findOne(id);
  }

  @Get(':id/history')
  @Roles(UserRole.OBODONLASHTIRISH_ADMIN, UserRole.OBODONLASHTIRISH_OPERATOR)
  history(
    @Param('id') id: string,
    @Query('sensorType') sensorType?: string,
    @Query('hours') hours?: string,
  ) {
    return this.linesService.getHistory(
      id,
      sensorType,
      hours ? Number(hours) : 24,
    );
  }

  @Post()
  @Roles(UserRole.OBODONLASHTIRISH_ADMIN, UserRole.OBODONLASHTIRISH_OPERATOR)
  create(@Body() dto: CreateLineDto, @CurrentUser() user: JwtPayload) {
    return this.linesService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.OBODONLASHTIRISH_ADMIN, UserRole.OBODONLASHTIRISH_OPERATOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLineDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.linesService.update(id, dto, user.sub);
  }

  @Post(':id/irrigation')
  @Roles(UserRole.OBODONLASHTIRISH_ADMIN, UserRole.OBODONLASHTIRISH_OPERATOR)
  control(
    @Param('id') id: string,
    @Body() dto: IrrigationControlDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.linesService.controlIrrigation(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.OBODONLASHTIRISH_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.linesService.remove(id, user.sub);
  }
}
