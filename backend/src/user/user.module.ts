// backend/src/user/user.module.ts

import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ManagementRelationship } from './entities/management-relationship.entity'; // 1. Import the new entity

@Module({
  // 2. Add the ManagementRelationship entity to this array
  imports: [TypeOrmModule.forFeature([User, ManagementRelationship])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
