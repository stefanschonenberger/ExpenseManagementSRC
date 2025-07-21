// ==========================================================
// File: src/user/user.service.ts
// This is the complete and corrected version of the file.
// ==========================================================
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ManagementRelationship } from './entities/management-relationship.entity';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto'; // FIX: Add the missing import

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ManagementRelationship)
    private readonly managementRepository: Repository<ManagementRelationship>,
  ) {}

  async adminResetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.findOne(userId);
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email.toLowerCase() } });
    if (existingUser) {
        throw new ConflictException('User with this email already exists');
    }
    const newUser = this.userRepository.create({ ...createUserDto, password_hash: createUserDto.password });
    return this.userRepository.save(newUser);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // The endpoint this is called from is already protected by the Admin guard.
    // An admin should be able to manage other admins, so the check is removed.

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    // Clean up relationships when deleting a user
    await this.managementRepository.delete({ employee_id: id });
    await this.managementRepository.delete({ manager_id: id });
    await this.userRepository.remove(user);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    // Perform a case-insensitive search to handle any existing, non-normalized data.
    return this.userRepository.findOne({
        where: {
            email: Raw(alias => `LOWER(${alias}) = LOWER(:email)`, { email: email.toLowerCase() })
        }
    });
  }

  async findMyManagers(employee: User): Promise<User[]> {
    const relationships = await this.managementRepository.find({
      where: { employee_id: employee.id },
      relations: ['manager'],
    });
    return relationships.map(rel => rel.manager).filter(Boolean);
  }

  async isManagerOfAnyone(user: User): Promise<{ isManager: boolean }> {
    const count = await this.managementRepository.count({
      where: { manager_id: user.id },
    });
    return { isManager: count > 0 };
  }

	/**
     * Allows a user to change their own password.
     */
    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
        const user = await this.findOne(userId);

        // 1. Verify the old password is correct
        const isPasswordCorrect = await bcrypt.compare(
            changePasswordDto.oldPassword,
            user.password_hash,
        );

        if (!isPasswordCorrect) {
            throw new UnauthorizedException('Invalid old password.');
        }

        // 2. Hash the new password before saving
        user.password_hash = await bcrypt.hash(changePasswordDto.newPassword, 10);

        // 3. Save the user with the new password hash
        await this.userRepository.save(user);
    }
}