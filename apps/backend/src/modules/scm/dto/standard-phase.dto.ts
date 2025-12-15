import { IsString, IsNumber, IsBoolean, IsOptional, MinLength, Min } from 'class-validator';

export class CreateStandardPhaseDto {
  @IsString()
  @MinLength(2, { message: 'Il nome deve contenere almeno 2 caratteri' })
  nome: string;

  @IsOptional()
  @IsString()
  codice?: string;

  @IsOptional()
  @IsString()
  descrizione?: string;

  @IsNumber()
  @Min(0, { message: "L'ordine deve essere un numero positivo" })
  ordine: number;

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;
}

export class UpdateStandardPhaseDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Il nome deve contenere almeno 2 caratteri' })
  nome?: string;

  @IsOptional()
  @IsString()
  codice?: string;

  @IsOptional()
  @IsString()
  descrizione?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: "L'ordine deve essere un numero positivo" })
  ordine?: number;

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;
}
