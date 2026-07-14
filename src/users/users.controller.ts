import { Controller, Body, Delete, UploadedFile, Get, Patch, Req, Post, UseInterceptors, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UploadService } from 'src/upload/upload.service';

 @Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly uploadService: UploadService) {}

  @Get('/')
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('/by-email')
  async findByEmail(@Query('email') email: string) {
    return this.usersService.findByEmail(email);
  }


  @Get('/me')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Req() req) {
    const userId = req.user['id_user'];
    return this.usersService.findById(userId);
  }

  @Patch('/me')
  @UseGuards(AuthGuard('jwt'))
  async updateCurrentUser(@Body() body: any, @Req() req) {
    const userId = req.user['id_user'];
    return this.usersService.updateUser(userId, body);
  }

  @Patch('/update')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('image', {
    limits: {
      fileSize: 100 * 1024 * 1024, 
    }
  }))
  async updateUser(
    @UploadedFile() image: Express.Multer.File,
    @Body() body: any,
    @Req() req
  ) {
    const userId = req.user['id_user'];

    if (image) {
      const uploaded = await this.uploadService.uploadFile(image);
      body.image = uploaded.data.url;
    }

    return this.usersService.updateUser(userId, body);
  }

  @Post('/delete')
  @UseGuards(AuthGuard('jwt'))
  async deleteUser(@Req() req) {
    const userId = req.user['id_user'];
    return this.usersService.deleteUser(userId);
  }

  @Delete('/me')
  @UseGuards(AuthGuard('jwt'))
  async deleteCurrentUser(@Req() req) {
    const userId = req.user['id_user'];
    return this.usersService.deleteUser(userId);
  }

  @Post('/logout')
  @UseGuards(AuthGuard('jwt'))
  async logOutUser(@Req() req) {
    const userId = req.user['id_user'];
    return this.usersService.logOutUser(userId);
  }

  @Post('/:id_user')
  async generateNewToken(@Req() req) {
    return this.usersService.generateNewToken(req.params.id_user, req.body);
  }
}
