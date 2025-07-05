import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'admin_settings' })
export class AdminSettings {
    @PrimaryColumn({ default: 1 })
    id: number;

    @Column('simple-array', { default: 'General,Travel,Meals' })
    expense_types: string[];
    
    @Column('decimal', { precision: 5, scale: 4, default: 0.15 })
    vat_rate: number;
    
    @Column({ type: 'int', default: 30 })
    inactivity_timeout_minutes: number;

    // New field for the finance department's email address
    @Column({ type: 'varchar', length: 255, nullable: true })
    finance_email: string;
    
    @UpdateDateColumn()
    updated_at: Date;
}
