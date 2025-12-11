import { IsString, IsOptional, IsDateString } from 'class-validator';

export class FilterRecordsDto {
  @IsOptional()
  @IsDateString()
  dataInizio?: string;

  @IsOptional()
  @IsDateString()
  dataFine?: string;

  @IsOptional()
  @IsString()
  reparto?: string;

  @IsOptional()
  @IsString()
  operatore?: string;

  @IsOptional()
  @IsString()
  tipoCq?: string;
}
