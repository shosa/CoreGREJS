import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateExceptionDto {
  @IsInt()
  cartellinoId: number;

  @IsString()
  taglia: string;

  @IsString()
  tipoDifetto: string;

  @IsOptional()
  @IsString()
  noteOperatore?: string;

  @IsOptional()
  @IsString()
  fotoPath?: string;
}
