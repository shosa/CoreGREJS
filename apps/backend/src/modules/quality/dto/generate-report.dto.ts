import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';

export class GenerateReportDto {
  @IsDateString()
  dataInizio: string;

  @IsOptional()
  @IsDateString()
  dataFine?: string;

  @IsEnum(['pdf', 'excel'])
  formato: 'pdf' | 'excel';

  @IsOptional()
  @IsString()
  reparto?: string;
}
