import { IsString, IsInt, IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateExceptionDto } from './create-exception.dto';

export class CreateRecordDto {
  @IsString()
  numeroCartellino: string;

  @IsOptional()
  @IsString()
  reparto?: string;

  @IsString()
  operatore: string;

  @IsOptional()
  @IsEnum(['INTERNO', 'GRIFFE'])
  tipoCq?: string;

  @IsInt()
  paiaTotali: number;

  @IsString()
  codArticolo: string;

  @IsString()
  articolo: string;

  @IsString()
  linea: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  haEccezioni?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExceptionDto)
  exceptions?: CreateExceptionDto[];
}
