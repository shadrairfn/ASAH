import { Injectable, Inject } from '@nestjs/common';
import { users } from 'src/db/schema';
import { eq } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class AuthService {
  constructor(@Inject('DRIZZLE') private readonly db) {}
  async googleLogin(user: any) {
    let existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);
    existingUser = existingUser[0];

    if (existingUser) {
      return {
        message: 'Login success (existing user)',
        user: existingUser,
        accessToken: jwt.sign(
          { email: existingUser.email, name: existingUser.name },
          process.env.JWT_SECRET!,
          { expiresIn: '7d' },
        ),
      };
    }

    const payload = {
      email: user.email,
      name: user.name,
      image: user.image,
    };

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: '30d',
    });

    const userWithTokens = {
      ...user,
      refresh_token: refreshToken,
    };

    console.log(userWithTokens);

    await this.db.insert(users).values(userWithTokens).returning();

    return {
      message: 'Login success (existing user)',
      user: userWithTokens,
      accessToken: jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '7d',
      }),
      refresh_token: refreshToken,
    };
  }
}
