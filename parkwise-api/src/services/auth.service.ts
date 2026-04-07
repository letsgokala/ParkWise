import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../db/data-source';
import { DriverEntity } from '../entities/Driver.entity';
import { ParkingAdminEntity } from '../entities/ParkingAdmin.entity';
import { UserEntity } from '../entities/User.entity';
import { AppError } from '../types/app-error';
import { AppUserDto, AuthResponseDto, LoginInput, OAuthMode, OAuthProvider, OAuthStatePayload, RegisterInput, UserRole } from '../types/api.types';
import { AppJwtPayload } from '../types/auth.types';
import { env } from '../config/env';
import { toUserDto } from './mappers';

const signToken = (payload: AppJwtPayload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });

interface OAuthProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name: string;
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(UserEntity);
  private driverRepository = AppDataSource.getRepository(DriverEntity);
  private parkingAdminRepository = AppDataSource.getRepository(ParkingAdminEntity);

  async register(input: RegisterInput): Promise<AuthResponseDto> {
    const { name, email, password, phone, role } = input;

    if (!name || !email || !password || !role || !['driver', 'parking_admin'].includes(role)) {
      throw new AppError(400, 'Missing required registration fields.');
    }

    if (role === 'driver' && !phone) {
      throw new AppError(400, 'Phone number is required for drivers.');
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await this.userRepository.findOneBy({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError(409, 'That email is already in use.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      id: randomUUID(),
      email: normalizedEmail,
      passwordHash,
      role,
      displayName: name,
      phoneNumber: phone || null,
    });

    await this.userRepository.save(user);

    if (role === 'driver') {
      const driver = this.driverRepository.create({
        userId: user.id,
        phoneNumber: phone!,
        accountStatus: 'Active',
      });
      await this.driverRepository.save(driver);
    }

    if (role === 'parking_admin') {
      const parkingAdmin = this.parkingAdminRepository.create({
        userId: user.id,
        facilityId: null,
      });
      await this.parkingAdminRepository.save(parkingAdmin);
    }

    return this.buildAuthResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponseDto> {
    const { email, password } = input;

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required.');
    }

    const user = await this.userRepository.findOneBy({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError(401, 'Invalid email or password.');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  getOAuthAuthorizationUrl(providerValue: string, modeValue: string, roleValue: string): string {
    const provider = this.parseOAuthProvider(providerValue);
    const mode = this.parseOAuthMode(modeValue);
    const role = this.parseOAuthRole(roleValue);
    const config = env.oauth[provider];

    if (!config.clientId || !config.clientSecret) {
      throw new AppError(503, `${this.getProviderLabel(provider)} OAuth is not configured on the server yet.`);
    }

    const redirectUri = this.getOAuthRedirectUri(provider);
    const state = jwt.sign({ provider, mode, role } satisfies OAuthStatePayload, env.jwtSecret, {
      expiresIn: '10m',
    });

    if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });

      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    if (provider === 'facebook') {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'email,public_profile',
        state,
      });

      return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(providerValue: string, code: string, stateToken: string): Promise<string> {
    const provider = this.parseOAuthProvider(providerValue);

    if (!code || !stateToken) {
      throw new AppError(400, 'Missing OAuth callback parameters.');
    }

    const state = this.verifyOAuthState(stateToken);
    if (state.provider !== provider) {
      throw new AppError(400, 'OAuth provider mismatch.');
    }

    const profile = await this.fetchOAuthProfile(provider, code);
    const authResponse = await this.loginWithOAuthProfile(profile, state.mode, state.role);

    return this.buildOAuthSuccessRedirect(authResponse);
  }

  async getCurrentUser(uid: string): Promise<AppUserDto> {
    const user = await this.userRepository.findOneBy({ id: uid });
    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    return toUserDto(user);
  }

  buildOAuthErrorRedirect(message: string): string {
    const params = new URLSearchParams({ error: message });
    return `${env.clientUrl}/oauth/callback#${params.toString()}`;
  }

  private buildAuthResponse(user: UserEntity): AuthResponseDto {
    const userDto = toUserDto(user);
    return {
      token: signToken({ uid: user.id, role: user.role as UserRole }),
      user: userDto,
    };
  }

  private buildOAuthSuccessRedirect(authResponse: AuthResponseDto): string {
    const params = new URLSearchParams({
      token: authResponse.token,
      user: JSON.stringify(authResponse.user),
    });

    return `${env.clientUrl}/oauth/callback#${params.toString()}`;
  }

  private parseOAuthProvider(provider: string): OAuthProvider {
    if (provider === 'google' || provider === 'facebook' || provider === 'github') {
      return provider;
    }

    throw new AppError(400, 'Unsupported OAuth provider.');
  }

  private parseOAuthMode(mode: string): OAuthMode {
    return mode === 'register' ? 'register' : 'login';
  }

  private parseOAuthRole(role: string): Extract<UserRole, 'driver' | 'parking_admin'> {
    return role === 'parking_admin' ? 'parking_admin' : 'driver';
  }

  private verifyOAuthState(stateToken: string): OAuthStatePayload {
    try {
      const payload = jwt.verify(stateToken, env.jwtSecret) as OAuthStatePayload;
      return {
        provider: this.parseOAuthProvider(payload.provider),
        mode: this.parseOAuthMode(payload.mode),
        role: this.parseOAuthRole(payload.role),
      };
    } catch {
      throw new AppError(400, 'OAuth session expired or is invalid.');
    }
  }

  private getOAuthRedirectUri(provider: OAuthProvider): string {
    return `${env.apiUrl}/api/auth/oauth/${provider}/callback`;
  }

  private getProviderLabel(provider: OAuthProvider): string {
    if (provider === 'google') return 'Google';
    if (provider === 'facebook') return 'Facebook';
    return 'GitHub';
  }

  private async fetchOAuthProfile(provider: OAuthProvider, code: string): Promise<OAuthProfile> {
    if (provider === 'google') return this.fetchGoogleProfile(code);
    if (provider === 'facebook') return this.fetchFacebookProfile(code);
    return this.fetchGitHubProfile(code);
  }

  private async fetchGoogleProfile(code: string): Promise<OAuthProfile> {
    const redirectUri = this.getOAuthRedirectUri('google');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.oauth.google.clientId,
        client_secret: env.oauth.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await this.parseJsonResponse<{ access_token?: string; error_description?: string }>(tokenResponse);
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new AppError(401, tokenData.error_description || 'Google token exchange failed.');
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await this.parseJsonResponse<{ sub?: string; email?: string; name?: string }>(profileResponse);
    if (!profileResponse.ok || !profileData.sub || !profileData.email) {
      throw new AppError(401, 'Google profile is missing required account data.');
    }

    return {
      provider: 'google',
      providerAccountId: profileData.sub,
      email: profileData.email,
      name: profileData.name || profileData.email.split('@')[0],
    };
  }

  private async fetchFacebookProfile(code: string): Promise<OAuthProfile> {
    const redirectUri = this.getOAuthRedirectUri('facebook');
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.search = new URLSearchParams({
      client_id: env.oauth.facebook.clientId,
      client_secret: env.oauth.facebook.clientSecret,
      redirect_uri: redirectUri,
      code,
    }).toString();

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await this.parseJsonResponse<{ access_token?: string; error?: { message?: string } }>(tokenResponse);
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new AppError(401, tokenData.error?.message || 'Facebook token exchange failed.');
    }

    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.search = new URLSearchParams({
      fields: 'id,name,email',
      access_token: tokenData.access_token,
    }).toString();

    const profileResponse = await fetch(profileUrl);
    const profileData = await this.parseJsonResponse<{ id?: string; email?: string; name?: string; error?: { message?: string } }>(profileResponse);
    if (!profileResponse.ok || !profileData.id || !profileData.email) {
      throw new AppError(401, profileData.error?.message || 'Facebook account did not provide an email address.');
    }

    return {
      provider: 'facebook',
      providerAccountId: profileData.id,
      email: profileData.email,
      name: profileData.name || profileData.email.split('@')[0],
    };
  }

  private async fetchGitHubProfile(code: string): Promise<OAuthProfile> {
    const redirectUri = this.getOAuthRedirectUri('github');
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.oauth.github.clientId,
        client_secret: env.oauth.github.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await this.parseJsonResponse<{ access_token?: string; error_description?: string }>(tokenResponse);
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new AppError(401, tokenData.error_description || 'GitHub token exchange failed.');
    }

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'parkwise-oauth',
      },
    });

    const profileData = await this.parseJsonResponse<{ id?: number; name?: string; login?: string; email?: string }>(profileResponse);
    if (!profileResponse.ok || !profileData.id) {
      throw new AppError(401, 'GitHub profile lookup failed.');
    }

    let email = profileData.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'parkwise-oauth',
        },
      });

      const emailData = await this.parseJsonResponse<Array<{ email: string; primary: boolean; verified: boolean }>>(emailResponse);
      email = emailData.find((entry) => entry.primary && entry.verified)?.email || emailData.find((entry) => entry.verified)?.email;
    }

    if (!email) {
      throw new AppError(401, 'GitHub account did not expose a verified email address.');
    }

    return {
      provider: 'github',
      providerAccountId: String(profileData.id),
      email,
      name: profileData.name || profileData.login || email.split('@')[0],
    };
  }

  private async loginWithOAuthProfile(
    profile: OAuthProfile,
    mode: OAuthMode,
    requestedRole: Extract<UserRole, 'driver' | 'parking_admin'>
  ): Promise<AuthResponseDto> {
    const normalizedEmail = profile.email.toLowerCase();
    let user = await this.userRepository.findOneBy({ email: normalizedEmail });

    if (!user) {
      const passwordHash = await bcrypt.hash(randomUUID(), 10);
      user = this.userRepository.create({
        id: randomUUID(),
        email: normalizedEmail,
        passwordHash,
        role: requestedRole,
        displayName: profile.name,
        phoneNumber: null,
      });
      await this.userRepository.save(user);

      if (requestedRole === 'driver') {
        const driver = this.driverRepository.create({
          userId: user.id,
          phoneNumber: 'OAuth signup',
          accountStatus: 'Active',
        });
        await this.driverRepository.save(driver);
      }

      if (requestedRole === 'parking_admin') {
        const parkingAdmin = this.parkingAdminRepository.create({
          userId: user.id,
          facilityId: null,
        });
        await this.parkingAdminRepository.save(parkingAdmin);
      }
    } else if (mode === 'register' && user.role !== requestedRole) {
      throw new AppError(409, `An account with ${normalizedEmail} already exists as ${user.role.replace('_', ' ')}.`);
    }

    return this.buildAuthResponse(user);
  }

  private async parseJsonResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  }
}
