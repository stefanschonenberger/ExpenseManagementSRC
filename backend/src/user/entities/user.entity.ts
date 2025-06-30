// ==========================================================
// File: src/user/entities/user.entity.ts
// This file is updated to use 'roles' instead of 'role'.
// ==========================================================
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ManagementRelationship } from './management-relationship.entity';

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  full_name: string;

  // FIX: This property is now 'roles' and is an array.
  @Column({
    type: 'simple-array',
    default: [UserRole.EMPLOYEE],
  })
  roles: UserRole[];

  @OneToMany(() => ManagementRelationship, (rel) => rel.manager)
  manages: ManagementRelationship[];

  @OneToMany(() => ManagementRelationship, (rel) => rel.employee)
  managed_by: ManagementRelationship[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password_hash) {
      this.password_hash = await bcrypt.hash(this.password_hash, 10);
    }
  }
}