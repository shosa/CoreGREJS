import { IsString, IsBoolean, IsInt, IsOptional } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  nomeReparto: string;

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;

  @IsOptional()
  @IsInt()
  ordine?: number;
}
