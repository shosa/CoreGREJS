import { IsDateString } from 'class-validator';

export class CompactDto {
  @IsDateString()
  dataDa: string;

  @IsDateString()
  dataA: string;
}
