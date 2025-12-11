import { IsString, IsBoolean, IsInt, IsOptional } from 'class-validator';

export class CreateDefectTypeDto {
  @IsString()
  descrizione: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;

  @IsOptional()
  @IsInt()
  ordine?: number;
}
