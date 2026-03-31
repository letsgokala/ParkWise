import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../db/data-source';
import { DriverEntity } from '../entities/Driver.entity';
import { ParkingAdminEntity } from '../entities/ParkingAdmin.entity';
import { UserEntity } from '../entities/User.entity';
import { AppError } from '../types/app-error';
import { AppUserDto, AuthResponseDto, LoginInput, RegisterInput, UserRole } from '../types/api.types';
import { AppJwtPayload } from '../types/auth.types';
import { env } from '../config/env';
import { toUserDto } from './mappers';

const signToken = (payload: AppJwtPayload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });

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

  async getCurrentUser(uid: string): Promise<AppUserDto> {
    const user = await this.userRepository.findOneBy({ id: uid });
    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    return toUserDto(user);
  }

  private buildAuthResponse(user: UserEntity): AuthResponseDto {
    const userDto = toUserDto(user);
    return {
      token: signToken({ uid: user.id, role: user.role as UserRole }),
      user: userDto,
    };
  }
}
