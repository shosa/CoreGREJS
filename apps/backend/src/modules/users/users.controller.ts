import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post()
  @LogActivity({ module: 'users', action: 'create', entity: 'User', description: 'Creazione nuovo utente' })
  async create(@Body() data: any) {
    try {
      return await this.usersService.create(data);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new HttpException('Username o email già esistente', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  @Put(':id')
  @LogActivity({ module: 'users', action: 'update', entity: 'User', description: 'Modifica utente' })
  async update(@Param('id') id: string, @Body() data: any) {
    try {
      return await this.usersService.update(+id, data);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new HttpException('Username o email già esistente', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  @Delete(':id')
  @LogActivity({ module: 'users', action: 'delete', entity: 'User', description: 'Eliminazione utente' })
  delete(@Param('id') id: string) {
    return this.usersService.delete(+id);
  }

  @Post('delete-bulk')
  @LogActivity({ module: 'users', action: 'delete_bulk', entity: 'User', description: 'Eliminazione multipla utenti' })
  deleteBulk(@Body() data: { ids: number[] }) {
    return this.usersService.deleteBulk(data.ids);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.usersService.getPermissions(+id);
  }

  @Put(':id/permissions')
  @LogActivity({ module: 'users', action: 'update_permissions', entity: 'User', description: 'Modifica permessi utente' })
  updatePermissions(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updatePermissions(+id, data);
  }
}
