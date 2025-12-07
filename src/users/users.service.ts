import { Inject, Injectable } from '@nestjs/common';
import { users } from '../db/schema/index';
import { UpdateUserDto } from './dto/update-user.dto';
import { eq } from "drizzle-orm";
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class UsersService {
  constructor(@Inject('DRIZZLE') private readonly db) {}
  
  async updateUser(id_user: string, data: UpdateUserDto) {
    console.log("DATA MASUK:", data);

    await this.db
      .update(users)
      .set(data)
      .where(eq(users.id_user, id_user))
      .returning();

    const updatedUser = await this.db
    .select({
      id_user: users.id_user,
      email: users.email,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id_user, id_user))
    .limit(1);

    return {
      status: 200,
      message: 'User updated successfully',
      data: updatedUser[0],
    }
  }

  async findAll() {
    const user = await this.db.select({
      id_user: users.id_user,
      email: users.email,
      name: users.name,
      image: users.image,
    })
    .from(users);

    return {
      status: 200,
      message: 'Users found successfully',
      data: user,
    };
  }

  async findById(id_user: string) {
    const user = await this.db
    .select({
      id_user: users.id_user,
      email: users.email,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id_user, id_user))
    .limit(1);

    return {
      status: 200,
      message: 'User found successfully',
      data: user[0],
    }
  }

  async logOutUser(id_user: string) {
    const user = await this.db
    .update(users)
    .set({ refresh_token: null })
    .where(eq(users.id_user, id_user))
    .returning();

    return {
      status: 200,
      message: 'User logged out successfully',
      data: user[0],
    };
  }

  async deleteUser(id_user: string) {
    const user = await this.db
    .delete(users)
    .where(eq(users.id_user, id_user))
    .returning();

    return {
      status: 200,
      message: 'User deleted successfully',
      data: user[0],
    };
  }

  async generateNewToken(id_user: string, email: string) {
    const newAccessToken = jwt
    .sign(
      { sub: id_user, email: email },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' },
    );

    const newRefreshToken = jwt
    .sign(
      { sub: id_user, email: email },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' },
    );

    await this.db
    .update(users)
    .set({ refresh_token: newRefreshToken })
    .where(eq(users.email, email!))
    .returning();

    return {
      status: 200,
      message: 'New tokens generated successfully',
      data: { accessToken: newAccessToken } 
    }
  }
}