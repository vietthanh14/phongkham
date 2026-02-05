-- Database Schema cho ClinicFlow

-- 1. Bảng Bệnh nhân (Quản lý theo CCCD)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cccd VARCHAR(20) UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    dob DATE,
    gender TEXT,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng Danh mục nhân viên (Lễ tân, Bác sĩ, KTV)
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Receptionist', 'Doctor', 'Technician')),
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Bảng Lượt khám (Visits)
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    status TEXT NOT NULL DEFAULT 'Waiting for Exam' 
        CHECK (status IN ('Waiting for Exam', 'Examing', 'Waiting for Service', 'Return to Doctor', 'Ready for Payment', 'Done', 'Missed')),
    reception_by TEXT, -- Tên nhân viên lễ tân
    doctor_by TEXT,    -- Tên bác sĩ khám
    reason TEXT,       -- Lý do khám
    conclusion TEXT,   -- Kết luận của bác sĩ
    total_amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng Dịch vụ chỉ định (X-Ray, Siêu âm, v.v.)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- 'X-Ray', 'Ultrasound', etc.
    result_text TEXT,
    image_url TEXT, -- Link ảnh lưu trên Google Drive
    tech_by TEXT,   -- Tên kỹ thuật viên thực hiện
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Skipped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Bảng Danh mục thuốc (Sẵn có)
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT, -- vỉ, viên, chai...
    price DECIMAL(12, 2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Bảng Đơn thuốc chi tiết
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    medication_data JSONB NOT NULL, -- Lưu danh sách thuốc (tên, liều lượng, số lượng)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Bảng Danh mục Dịch vụ (Bảng giá)
CREATE TABLE service_catalog (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Dữ liệu mẫu ban đầu cho Dịch vụ
INSERT INTO service_catalog (name, price) VALUES 
('Khám bệnh', 50000),
('Chụp X-Quang', 100000),
('Siêu âm', 100000),
('Xét nghiệm máu', 100000),
('Nội soi', 100000),
('Điện tim', 100000)
ON CONFLICT (name) DO NOTHING;

-- Chèn dữ liệu mẫu cho nhân viên
INSERT INTO staff (name, role) VALUES 
('Lễ tân A', 'Receptionist'),
('Bác sĩ Nam', 'Doctor'),
('Bác sĩ Lan', 'Doctor'),
('KTV Hùng', 'Technician'),
('KTV Mai', 'Technician');

-- Chèn dữ liệu thuốc mẫu
INSERT INTO medications (name, unit, price, stock) VALUES 
('Paracetamol 500mg', 'Viên', 1000, 1000),
('Amoxicillin 500mg', 'Viên', 2000, 500),
('Vitamin C 500mg', 'Viên', 1000, 200),
('Panadol Extra', 'Vỉ', 15000, 100);
