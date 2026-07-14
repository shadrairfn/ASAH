import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UploadService } from 'src/upload/upload.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly uploadService: UploadService) {}

  @Get('/')
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Req() req) {
    const userId = req.user['id_user'];
    return this.usersService.findById(userId);
  }

  @Get('/by-email')
  @UseGuards(AuthGuard('jwt'))
  async findByEmail(@Query('email') email: string, @Req() req) {
    if (email !== req.user['email']) {
      throw new ForbiddenException('Cannot query another user profile.');
    }

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
  @UseGuards(AuthGuard('jwt'))
  async generateNewToken(@Param('id_user') idUser: string, @Req() req) {
    if (idUser !== req.user['id_user']) {
      throw new ForbiddenException('Cannot generate token for another user.');
    }

    return this.usersService.generateNewToken(req.user['id_user'], req.user['email']);
  }
}
