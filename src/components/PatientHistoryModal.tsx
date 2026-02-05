'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Visit, Patient } from '@/types';
import { X, Calendar, User, FileText, Pill, Activity } from 'lucide-react';

interface PatientHistoryModalProps {
    patient: { id: string; full_name: string; cccd: string } | null;
    onClose: () => void;
}

export default function PatientHistoryModal({ patient, onClose }: PatientHistoryModalProps) {
    const [visits, setVisits] = useState<any[]>([]); // Using any to handle nested relations easily
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (patient) {
            fetchHistory();
        }
    }, [patient]);

    async function fetchHistory() {
        setLoading(true);
        const { data, error } = await supabase
            .from('visits')
            .select(`
                *,
                prescriptions (*),
                services (*)
            `)
            .eq('patient_id', patient!.id)
            .order('created_at', { ascending: false });

        if (data) {
            setVisits(data);
        }
        setLoading(false);
    }

    if (!patient) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-blue-50">
                    <div>
                        <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                            <Activity className="text-blue-600" /> Lịch sử Khám bệnh
                        </h2>
                        <p className="text-sm text-blue-600 font-medium mt-1">
                            Bệnh nhân: {patient.full_name} - CCCD: {patient.cccd}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-800"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Đang tải dữ liệu...</div>
                    ) : visits.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 italic">Chưa có lịch sử khám nào.</div>
                    ) : (
                        <div className="space-y-6">
                            {visits.map((visit) => (
                                <div key={visit.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                    {/* Visit Header */}
                                    <div className="bg-gray-100 p-3 border-b flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-gray-700 flex items-center gap-1">
                                                <Calendar size={16} /> {new Date(visit.created_at).toLocaleDateString('vi-VN')} {new Date(visit.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full border ${visit.status === 'Done' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                {visit.status === 'Done' ? 'Hoàn thành' : visit.status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 flex items-center gap-1">
                                            <User size={14} /> BS: <span className="font-medium">{visit.doctor_by || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Left: Consult */}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Lý do khám</label>
                                                <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded border border-gray-100 mt-1">{visit.reason || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Chẩn đoán / Kết luận</label>
                                                <p className="text-sm font-medium text-blue-900 bg-blue-50 p-2 rounded border border-blue-100 mt-1">{visit.conclusion || 'Chưa có kết luận'}</p>
                                            </div>
                                        </div>

                                        {/* Right: Prescriptions & Services */}
                                        <div className="space-y-4">
                                            {/* Services */}
                                            {visit.services && visit.services.length > 0 && (
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Dịch vụ đã làm</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {visit.services.map((s: any) => (
                                                            <span key={s.id} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded">
                                                                {s.service_type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Prescriptions */}
                                            {visit.prescriptions && visit.prescriptions.length > 0 && visit.prescriptions[0].medication_data && (
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block flex items-center gap-1">
                                                        <Pill size={12} /> Đơn thuốc
                                                    </label>
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs space-y-1">
                                                        {visit.prescriptions[0].medication_data.map((m: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between">
                                                                <span className="font-medium text-gray-700">• {m.name}</span>
                                                                <span className="text-gray-500">{m.qty}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
