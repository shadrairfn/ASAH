import { Injectable, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { users } from 'src/db/schema';
import { eq } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt'; 
import * as dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library'; 

dotenv.config({ quiet: true });

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be configured.`);
  }

  return value;
}

function sanitizeUser(user: typeof users.$inferSelect) {
  const { refresh_token, ...safeUser } = user;
  return safeUser;
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @Inject('DRIZZLE') private readonly db: any, 
    private readonly jwtService: JwtService 
  ) {
    this.googleClient = new OAuth2Client(
      getRequiredEnv('GOOGLE_CLIENT_ID'), 
      getRequiredEnv('GOOGLE_CLIENT_SECRET'),
      'postmessage' 
    );
  }

  async googleLogin(code: string) {
    let payload;

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
          client_secret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
          redirect_uri: 'postmessage',
          grant_type: 'authorization_code',
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        console.error('Google token exchange failed:', tokenData.error);
        throw new BadRequestException(`Google API Error: ${tokenData.error_description || tokenData.error}`);
      }

      const tokens = { id_token: tokenData.id_token };
      
      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token!, 
        audience: getRequiredEnv('GOOGLE_CLIENT_ID'),
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
      let isNewUser = false;

      if (!finalUser) {
        const newUserPayload = {
          email: email,
          name: name,
          image: picture, 
        };

        const insertedUsers = await this.db.insert(users).values(newUserPayload).returning();
        finalUser = insertedUsers[0]; 
        isNewUser = true;
      }

      const jwtPayload = { 
        sub: finalUser.id_user, 
        email: finalUser.email 
      };

      const accessToken = this.jwtService.sign(jwtPayload, { 
        secret: getRequiredEnv('JWT_SECRET'), 
        expiresIn: '1d' 
      });

      const refreshToken = this.jwtService.sign(jwtPayload, { 
        secret: getRequiredEnv('JWT_REFRESH_SECRET'), 
        expiresIn: '7d' 
      });

      // Update Refresh Token
      await this.db
        .update(users)
        .set({ refresh_token: refreshToken })
        .where(eq(users.id_user, finalUser.id_user));

      return {
        message: 'Login success',
        user: sanitizeUser(finalUser),
        isNewUser,
        accessToken,
        refreshToken,
      };

    } catch (error) {
      console.error('Login persistence failed:', error instanceof Error ? error.message : error);
      throw new InternalServerErrorException('Database transaction failed');
    }
  }
}
