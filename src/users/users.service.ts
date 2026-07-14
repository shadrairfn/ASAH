import { Inject, Injectable, Query} from '@nestjs/common';
import { users } from '../db/schema/index';
import { UpdateUserDto } from './dto/update-user.dto';
import { eq } from "drizzle-orm";
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class UsersService {
  constructor(@Inject('DRIZZLE') private readonly db) {}

  private userSelect() {
    return {
      id_user: users.id_user,
      email: users.email,
      name: users.name,
      image: users.image,
      birth_date: users.birth_date,
      gender_type: users.gender_type,
      role: users.role,
      created_at: users.created_at,
      updated_at: users.updated_at,
    };
  }

  private normalizeUpdatePayload(data: UpdateUserDto) {
    const payload = data as Record<string, any>;
    const nextData: Record<string, any> = {};

    if (typeof payload.name === 'string') nextData.name = payload.name.trim();
    if (typeof payload.image === 'string') nextData.image = payload.image.trim() || null;
    if (payload.birth_date !== undefined) nextData.birth_date = payload.birth_date || null;
    if (
      payload.gender_type === 'male' ||
      payload.gender_type === 'female' ||
      payload.gender_type === 'other' ||
      payload.gender_type === null
    ) {
      nextData.gender_type = payload.gender_type;
    }

    return nextData;
  }
  
  async updateUser(id_user: string, data: UpdateUserDto) {
    const nextData = this.normalizeUpdatePayload(data);

    await this.db
      .update(users)
      .set(nextData)
      .where(eq(users.id_user, id_user))
      .returning();

    const updatedUser = await this.db
    .select(this.userSelect())
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
    const user = await this.db.select(this.userSelect())
    .from(users);

    return {
      status: 200,
      message: 'Users found successfully',
      data: user,
    };
  }

  async findById(id_user: string) {
    const user = await this.db
    .select(this.userSelect())
    .from(users)
    .where(eq(users.id_user, id_user))
    .limit(1);

    return {
      status: 200,
      message: 'User found successfully',
      data: user[0],
    }
  }

  async findByEmail(@Query('email') email: string) {
    const user = await this.db
    .select(this.userSelect())
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

    if (user.length === 0) {
      return {
        status: 404,
        message: 'User not found',
        data: null,
      }
    }

    return {
      status: 200,
      message: 'User found successfully',
      data: user,
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
