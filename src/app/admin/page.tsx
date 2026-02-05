'use client';

import { useState } from 'react';
import StaffManager from '@/components/admin/StaffManager';
import PatientManager from '@/components/admin/PatientManager';
import ServiceManager from '@/components/admin/ServiceManager';
import MedicationManager from '@/components/admin/MedicationManager';
import { LayoutDashboard, Users, Tag, Pill } from 'lucide-react';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'staff' | 'patients' | 'services' | 'medications'>('staff');

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <LayoutDashboard className="text-primary" size={32} />
                    Quản trị Hệ thống
                </h1>
                <p className="text-gray-500 mt-2">Quản lý nhân sự, dịch vụ và kho thuốc</p>
            </header>

            <div className="flex gap-2 mb-6 border-b overflow-x-auto">
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'staff'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Users size={18} /> Nhân sự
                </button>
                <button
                    onClick={() => setActiveTab('patients')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'patients'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Users size={18} /> Bệnh nhân
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'services'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Tag size={18} /> Dịch vụ & Giá
                </button>
                <button
                    onClick={() => setActiveTab('medications')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'medications'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Pill size={18} /> Kho Thuốc
                </button>
            </div>

            <main className="animate-in fade-in duration-300">
                {activeTab === 'staff' && <StaffManager />}
                {activeTab === 'patients' && <PatientManager />}
                {activeTab === 'services' && <ServiceManager />}
                {activeTab === 'medications' && <MedicationManager />}
            </main>
        </div>
    );
}
