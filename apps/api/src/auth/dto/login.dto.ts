import { IsIn, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  /** Panel context: operator | monitoring */
  @IsIn(['operator', 'monitoring'])
  panel!: 'operator' | 'monitoring';
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
