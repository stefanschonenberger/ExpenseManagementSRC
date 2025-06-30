// backend/src/user/entities/management-relationship.entity.ts

import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'management_relationships' })
export class ManagementRelationship {
  @PrimaryColumn()
  employee_id: string;

  @PrimaryColumn()
  manager_id: string;

  // FIX: Add @JoinColumn decorator to be explicit about the relationship.
  // This tells TypeORM to use the 'employee_id' column in this table
  // to join with the User entity.
  @ManyToOne(() => User, (user) => user.managed_by)
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  // FIX: Add @JoinColumn for the manager relationship as well.
  @ManyToOne(() => User, (user) => user.manages)
  @JoinColumn({ name: 'manager_id' })
  manager: User;
}
