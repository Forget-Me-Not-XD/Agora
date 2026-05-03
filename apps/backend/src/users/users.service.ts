// ========== Imports: ==========
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(data: {
    name: string;
    surname: string;
    email: string;
    passwordHash: string;
    role: Role;
    studyCenter: string;
  }): Promise<UserDocument> {
    // Email uniqueness check (defence-in-depth — also enforced by index)
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');

    const created = new this.userModel({
      ...data,
      email: data.email.toLowerCase(),
    });
    return created.save();
  }

  async incrementFailedAttempts(userId: string): Promise<void> {
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    const user = await this.findById(userId);
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    }
    await user.save();
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { failedLoginAttempts: 0, lockedUntil: null } },
    ).exec();
  }
}