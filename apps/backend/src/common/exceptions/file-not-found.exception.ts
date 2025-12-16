import { HttpException, HttpStatus } from '@nestjs/common';

export class FileNotFoundException extends HttpException {
  constructor(message: string = 'File non più disponibile') {
    super(message, HttpStatus.NOT_FOUND);
  }
}
