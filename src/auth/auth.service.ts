import { Injectable, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { users } from 'src/db/schema';
import { eq } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt'; 
import * as dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library'; 

dotenv.config();

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @Inject('DRIZZLE') private readonly db: any, 
    private readonly jwtService: JwtService 
  ) {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID!, 
      process.env.GOOGLE_CLIENT_SECRET!,
      'postmessage' 
    );
  }

  async googleLogin(code: string) {
    let payload;

    try {
      const { tokens } = await this.googleClient.getToken(code);
      
      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token!, 
        audience: process.env.GOOGLE_CLIENT_ID!,
      });
      
      payload = ticket.getPayload();

      if (!payload) {
        throw new BadRequestException('Google Payload is empty');
      }

    } catch (error) {
      console.error('Google Validation Error:', error);
      throw new BadRequestException('Invalid Google Authorization Code');
    }

    const email = payload.email || '';
    const name = payload.name || 'No Name';
    const picture = payload.picture || '';

    if (!email) {
       throw new BadRequestException('Email not found in Google Account');
    }

    try {
      let existingUser = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      let finalUser = existingUser[0];

      if (!finalUser) {
        const newUserPayload = {
          email: email,
          name: name,
          image: picture, 
        };

        const insertedUsers = await this.db.insert(users).values(newUserPayload).returning();
        finalUser = insertedUsers[0]; 
      }

      const jwtPayload = { 
        sub: finalUser.id_user, 
        email: finalUser.email 
      };

      const accessToken = this.jwtService.sign(jwtPayload, { 
        secret: process.env.JWT_SECRET!, 
        expiresIn: '1d' 
      });

      const refreshToken = this.jwtService.sign(jwtPayload, { 
        secret: process.env.JWT_REFRESH_SECRET!, 
        expiresIn: '7d' 
      });

      // Update Refresh Token
      await this.db
        .update(users)
        .set({ refresh_token: refreshToken })
        .where(eq(users.id_user, finalUser.id_user));

      return {
        message: 'Login success',
        user: finalUser,
        accessToken,
        refresh_token: refreshToken,
      };

    } catch (error) {
      console.error('Database Error:', error);
      throw new InternalServerErrorException('Database transaction failed');
    }
  }
}