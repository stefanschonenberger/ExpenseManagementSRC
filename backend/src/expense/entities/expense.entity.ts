// backend/src/expense/entities/expense.entity.ts

import { ExpenseReport } from 'src/expense-report/entities/expense-report.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
}

@Entity({ name: 'expenses' })
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => ExpenseReport, (report) => report.expenses, {
    nullable: true,
  })
  report: ExpenseReport | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  supplier: string;

  @Column({ type: 'date' })
  expense_date: Date;

  @Column({ type: 'int' })
  amount: number;

  @Column()
  currency_code: string;

  @Column()
  expense_type: string;
  
  @Column({ type: 'boolean', default: false })
  book: boolean;

  @Column({ type: 'int', default: 0 })
  book_amount: number;

  @Column({ default: false })
  vat_applied: boolean;

  @Column({ type: 'int', default: 0 })
  vat_amount: number;

  @Column({ type: 'uuid', nullable: true })
  receipt_blob_id: string;

  @Column({
    type: 'enum',
    enum: ExpenseStatus,
    default: ExpenseStatus.DRAFT,
  })
  status: ExpenseStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
