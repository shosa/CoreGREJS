import { IsString, IsEmail, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class CreateLaboratoryDto {
  @IsOptional()
  @IsString()
  codice?: string;

  @IsString()
  @MinLength(2, { message: 'Il nome deve contenere almeno 2 caratteri' })
  nome: string;

  @IsOptional()
  @IsString()
  indirizzo?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email non valida' })
  email?: string;

  @IsOptional()
  @IsString()
  accessCode?: string;

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;
}

export class UpdateLaboratoryDto {
  @IsOptional()
  @IsString()
  codice?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Il nome deve contenere almeno 2 caratteri' })
  nome?: string;

  @IsOptional()
  @IsString()
  indirizzo?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email non valida' })
  email?: string;

  @IsOptional()
  @IsString()
  accessCode?: string;

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;
}
