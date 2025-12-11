import { PartialType } from '@nestjs/mapped-types';
import { CreateDefectTypeDto } from './create-defect-type.dto';

export class UpdateDefectTypeDto extends PartialType(CreateDefectTypeDto) {}
