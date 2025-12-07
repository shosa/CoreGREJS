import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nome?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userName?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  mail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  themeColor?: string;
}
