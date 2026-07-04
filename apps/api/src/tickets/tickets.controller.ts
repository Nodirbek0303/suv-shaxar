import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import { JwtPayload, TicketStatus, UserRole } from '@suv/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TicketsService } from './tickets.service';

class CreateTicketDto {
  @IsUUID()
  lineId!: string;

  @IsString()
  @MinLength(5)
  description!: string;
}

class UpdateTicketDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OBODONLASHTIRISH_ADMIN, UserRole.OBODONLASHTIRISH_OPERATOR)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(@Query('status') status?: TicketStatus) {
    return this.ticketsService.findAll(status);
  }

  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: JwtPayload) {
    return this.ticketsService.create(dto, user.sub);
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.updateStatus(id, dto.status);
  }
}
