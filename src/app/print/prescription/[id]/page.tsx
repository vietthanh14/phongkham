'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Visit, Prescription } from '@/types';
import { Printer, MapPin, Phone, Mail } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function PrintPrescriptionPage() {
    const params = useParams();
    const id = params?.id as string;
    const [visit, setVisit] = useState<Visit | null>(null);
    const [prescription, setPrescription] = useState<any[]>([]); // Using any for medication_data json
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    async function fetchData() {
        // 1. Fetch Visit & Patient
        const { data: visitData, error: visitError } = await supabase
            .from('visits')
            .select(`
                *,
                patient:patients(*)
            `)
            .eq('id', id)
            .single();

        if (visitError) {
            console.error(visitError);
            setLoading(false);
            return;
        }

        setVisit(visitData);

        // 2. Fetch Prescription
        const { data: presData } = await supabase
            .from('prescriptions')
            .select('medication_data')
            .eq('visit_id', id)
            .single();

        if (presData) {
            setPrescription(presData.medication_data);
        }

        setLoading(false);

        // Auto print after a short delay
        setTimeout(() => {
            window.print();
        }, 1000);
    }

    if (loading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;
    if (!visit) return <div className="p-10 text-center text-red-500">Không tìm thấy lượt khám</div>;

    return (
        <div className="bg-white min-h-screen p-8 text-black" style={{ maxWidth: '210mm', margin: '0 auto' }}>
            {/* Header */}
            <div className="flex gap-4 border-b-2 border-black pb-4 mb-6">
                <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-xs text-gray-500 rounded-full shrink-0">
                    LOGO
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold uppercase text-blue-900 mb-1">Phòng Khám Đa Khoa Yêu Thương</h1>
                    <div className="text-sm space-y-1">
                        <p className="flex items-center gap-2"><MapPin size={14} /> Số 10, Đường ABC, Quận XYZ, TP.HCM</p>
                        <p className="flex items-center gap-2"><Phone size={14} /> Hotline: 1900 1234 - 0909 888 777</p>
                        <p className="flex items-center gap-2"><Mail size={14} /> Support@phongkham.com</p>
                    </div>
                </div>
                <div className="text-right text-xs">
                    <p>Mã HS: {visit.patient?.cccd}</p>
                    <p>Mã LK: {visit.id.slice(0, 8)}</p>
                </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold uppercase mb-2">Đơn Thuốc</h2>
                <p className="italic text-sm">Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
            </div>

            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
                <div className="col-span-1"><span className="font-bold">Họ tên:</span> {visit.patient?.full_name}</div>
                <div className="col-span-1"><span className="font-bold">Tuổi:</span> {visit.patient?.dob ? new Date().getFullYear() - new Date(visit.patient.dob).getFullYear() : 'N/A'}</div>
                <div className="col-span-1"><span className="font-bold">Giới tính:</span> {visit.patient?.gender}</div>
                <div className="col-span-1"><span className="font-bold">Số điện thoại:</span> {visit.patient?.phone}</div>
                <div className="col-span-2"><span className="font-bold">Địa chỉ:</span> {visit.patient?.address}</div>
                <div className="col-span-2"><span className="font-bold">Chẩn đoán:</span> {visit.conclusion || 'Chưa có kết luận'}</div>
            </div>

            {/* Prescription List */}
            <div className="mb-8">
                <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-1">Chỉ định thuốc:</h3>
                {prescription.length === 0 ? (
                    <p className="italic text-gray-500">Không có thuốc được kê.</p>
                ) : (
                    <div className="space-y-4">
                        {prescription.map((item: any, index: number) => (
                            <div key={index} className="pl-2">
                                <div className="font-bold text-base flex justify-between">
                                    <span>{index + 1}. {item.name}</span>
                                    <span>Số lượng: {item.qty}</span>
                                </div>
                                <div className="italic text-sm text-gray-600 pl-4">
                                    - Cách dùng: {item.dose}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Advice */}
            <div className="mb-8 p-4 border border-dashed rounded-lg bg-gray-50 text-sm">
                <span className="font-bold">Lời dặn của bác sĩ:</span>
                <p className="italic mt-1 pl-2">{visit.reason ? `(Ghi chú: ${visit.reason})` : 'Tuân thủ đúng liều lượng thuốc. Tái khám khi hết thuốc.'}</p>
            </div>

            {/* Footer Signatures */}
            <div className="flex justify-between mt-12 mb-10">
                <div className="text-center w-48">
                    <p className="font-bold mb-16">Dược sĩ tư vấn</p>
                </div>
                <div className="text-center w-48">
                    <p className="italic text-sm mb-1">Ngày ..... tháng ..... năm 20...</p>
                    <p className="font-bold uppercase text-blue-900">Bác sĩ khám bệnh</p>
                    <div className="h-20"></div>
                    <p className="font-bold">{visit.doctor_by || 'Bác sĩ'}</p>
                </div>
            </div>

            <div className="text-center text-xs italic text-gray-400 mt-auto pt-4 border-t">
                Phiếu này có giá trị trong vòng 05 ngày kể từ ngày kê đơn.
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 10mm;
                    }
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
