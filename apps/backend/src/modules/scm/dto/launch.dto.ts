import { IsString, IsNumber, IsDate, IsOptional, IsArray, ValidateNested, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLaunchArticleDto {
  @IsString()
  codice: string;

  @IsString()
  descrizione: string;

  @IsNumber()
  @Min(1, { message: 'La quantità deve essere almeno 1' })
  quantita: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateLaunchDto {
  @IsString()
  numero: string;

  @IsNumber()
  laboratoryId: number;

  @Type(() => Date)
  @IsDate()
  dataLancio: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataConsegna?: Date;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLaunchArticleDto)
  articles: CreateLaunchArticleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLaunchPhaseInputDto)
  phases: CreateLaunchPhaseInputDto[];
}

export class CreateLaunchPhaseInputDto {
  @IsNumber()
  standardPhaseId: number;

  @IsNumber()
  ordine: number;
}

export class UpdateLaunchDto {
  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsNumber()
  laboratoryId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataLancio?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataConsegna?: Date;

  @IsOptional()
  @IsIn(['IN_PREPARAZIONE', 'IN_LAVORAZIONE', 'COMPLETATO', 'BLOCCATO'])
  stato?: string;

  @IsOptional()
  @IsString()
  blockedReason?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateLaunchArticleDto {
  @IsOptional()
  @IsString()
  codice?: string;

  @IsOptional()
  @IsString()
  descrizione?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'La quantità deve essere almeno 1' })
  quantita?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateLaunchPhaseDto {
  @IsOptional()
  @IsIn(['NON_INIZIATA', 'IN_CORSO', 'COMPLETATA', 'BLOCCATA'])
  stato?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataInizio?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataFine?: Date;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AddProgressTrackingDto {
  @IsNumber()
  @Min(0)
  quantita: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  data?: Date;

  @IsOptional()
  @IsString()
  note?: string;
}
