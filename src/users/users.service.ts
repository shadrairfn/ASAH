import { Inject, Injectable } from '@nestjs/common';
import { users } from '../db/schema/index';
import { CreateUserDto } from './dto/create-user.dto';
import { eq } from "drizzle-orm";
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class UsersService {
  constructor(@Inject('DRIZZLE') private readonly db) {}
  
  async createUser(data: CreateUserDto) {
    return await this.db.insert(users).values(data).returning();
  }

  async findAll() {
    return this.db.select().from(users);
  }

  async findByEmail(email: string) {
    return this.db.select().from(users).where(eq(users.email, email));
  }
}
