// backend/src/user/user.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw, EntityManager } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ManagementRelationship } from './entities/management-relationship.entity';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ExpenseReport } from 'src/expense-report/entities/expense-report.entity';
import { Expense } from 'src/expense/entities/expense.entity';
import { BlobService } from 'src/blob/blob.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ManagementRelationship)
    private readonly managementRepository: Repository<ManagementRelationship>,
    @InjectRepository(ExpenseReport)
    private readonly reportRepository: Repository<ExpenseReport>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    private readonly blobService: BlobService,
    private readonly entityManager: EntityManager,
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
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    await this.entityManager.transaction(async transactionalEntityManager => {
        const user = await transactionalEntityManager.findOne(User, { where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        // 1. Find all expenses to get blob IDs
        const expenses = await transactionalEntityManager.find(Expense, { where: { user: { id } } });
        const blobIdsToDelete = expenses
            .map(e => e.receipt_blob_id)
            .filter((id): id is string => id !== null);

        // 2. Delete all associated blobs
        if (blobIdsToDelete.length > 0) {
            await Promise.all(blobIdsToDelete.map(blobId => this.blobService.deleteBlob(blobId)));
        }

        // 3. Delete all expense reports associated with the user
        await transactionalEntityManager.delete(ExpenseReport, { user: { id } });
        
        // 4. Delete all expenses associated with the user
        await transactionalEntityManager.delete(Expense, { user: { id } });

        // 5. Clean up management relationships
        await transactionalEntityManager.delete(ManagementRelationship, { employee_id: id });
        await transactionalEntityManager.delete(ManagementRelationship, { manager_id: id });

        // 6. Finally, delete the user
        await transactionalEntityManager.remove(user);
    });
  }

  async findOneByEmail(email: string): Promise<User | null> {
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

	async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
        const user = await this.findOne(userId);

        const isPasswordCorrect = await bcrypt.compare(
            changePasswordDto.oldPassword,
            user.password_hash,
        );

        if (!isPasswordCorrect) {
            throw new UnauthorizedException('Invalid old password.');
        }

        user.password_hash = await bcrypt.hash(changePasswordDto.newPassword, 10);

        await this.userRepository.save(user);
    }
}