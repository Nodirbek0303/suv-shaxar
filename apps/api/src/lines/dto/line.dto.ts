import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IrrigationMode, LineStatus } from '@suv/shared';

class CoordinateDto {
  @IsNumber()
  lng!: number;

  @IsNumber()
  lat!: number;
}

export class CreateLineDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsUUID()
  regionId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  coordinates!: CoordinateDto[];

  @IsString()
  plantType!: string;

  @IsOptional()
  @IsString()
  irrigationType?: string;

  @IsOptional()
  @IsNumber()
  lengthMeters?: number;

  @IsOptional()
  @IsDateString()
  installedDate?: string;

  @IsOptional()
  @IsEnum(LineStatus)
  status?: LineStatus;
}

export class UpdateLineDto {
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  coordinates?: CoordinateDto[];

  @IsOptional()
  @IsString()
  plantType?: string;

  @IsOptional()
  @IsString()
  irrigationType?: string;

  @IsOptional()
  @IsNumber()
  lengthMeters?: number;

  @IsOptional()
  @IsDateString()
  installedDate?: string;

  @IsOptional()
  @IsEnum(LineStatus)
  status?: LineStatus;

  @IsOptional()
  @IsEnum(IrrigationMode)
  irrigationMode?: IrrigationMode;

  @IsOptional()
  @IsBoolean()
  irrigationOn?: boolean;

  @IsOptional()
  @IsString()
  designPlanUrl?: string;
}

export class IrrigationControlDto {
  @IsBoolean()
  irrigationOn!: boolean;

  @IsOptional()
  @IsEnum(IrrigationMode)
  irrigationMode?: IrrigationMode;
}
