// ==========================================================
// File: src/admin/entities/admin-settings.entity.ts
// Add the new timeout property to this entity.
// ==========================================================
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'admin_settings' })
export class AdminSettings {
    @PrimaryColumn({ default: 1 })
    id: number;

    @Column('simple-array', { default: 'General,Travel,Meals' })
    expense_types: string[];
    
    @Column('decimal', { precision: 5, scale: 4, default: 0.15 })
    vat_rate: number;
    
    // New property for the timeout in minutes
    @Column({ type: 'int', default: 30 })
    inactivity_timeout_minutes: number;
    
    @UpdateDateColumn()
    updated_at: Date;
}