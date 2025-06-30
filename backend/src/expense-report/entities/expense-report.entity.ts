// backend/src/expense-report/entities/expense-report.entity.ts

import { Expense } from 'src/expense/entities/expense.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity({ name: 'expense_reports' })
export class ExpenseReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  // Many-to-one relationship: Many reports can belong to one user.
  @ManyToOne(() => User, { eager: true }) // eager: true automatically loads the user
  user: User;

  // Many-to-one relationship: Many reports can be approved by one manager.
  @ManyToOne(() => User, { eager: true, nullable: true })
  approver: User;

  // One-to-many relationship: One report can have many expenses.
  @OneToMany(() => Expense, (expense) => expense.report)
  expenses: Expense[];

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.DRAFT,
  })
  status: ReportStatus;

  @Column({ type: 'int', default: 0 })
  total_amount: number;

  @Column({ type: 'int', default: 0 })
  total_vat_amount: number;

  @Column({ type: 'timestamp', nullable: true })
  submitted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  decision_at: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
