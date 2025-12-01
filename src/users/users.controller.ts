import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

 @Controller('login')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

}
