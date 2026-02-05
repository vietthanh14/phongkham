export type UserRole = 'Receptionist' | 'Doctor' | 'Technician';

export interface Staff {
    id: number;
    name: string;
    role: UserRole;
    is_active: boolean;
}

export interface Medication {
    id: number;
    name: string;
    unit?: string;
    price?: number;
    is_active?: boolean;
}

export interface Patient {
    id: string;
    cccd: string;
    full_name: string;
    dob?: string;
    gender?: string;
    phone?: string;
    address?: string;
    created_at: string;
}

export type VisitStatus =
    | 'Waiting for Exam'
    | 'Examing'
    | 'Waiting for Service'
    | 'Return to Doctor'
    | 'Ready for Payment'
    | 'Done'
    | 'Missed';

export interface Visit {
    id: string;
    patient_id: string;
    status: VisitStatus;
    reception_by: string;
    doctor_by?: string;
    reason?: string;
    conclusion?: string;
    total_amount: number;
    created_at: string;
    updated_at: string;
    patient?: Patient;
    services?: Service[];
}

export interface Service {
    id: string;
    visit_id: string;
    service_type: string;
    result_text?: string;
    image_url?: string;
    tech_by?: string;
    status: 'Pending' | 'Completed' | 'Skipped';
    created_at: string;
}

export interface Prescription {
    id: string;
    visit_id: string;
    medication_data: any;
    created_at: string;
}
