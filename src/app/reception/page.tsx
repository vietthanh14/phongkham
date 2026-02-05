'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff, Patient, Visit } from '@/types';
import { Search, UserPlus, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import QueueList from '@/components/QueueList';
import PaymentModal from '@/components/PaymentModal';

export default function ReceptionPage() {
    const [receptionists, setReceptionists] = useState<Staff[]>([]);
    const [selectedReceptionist, setSelectedReceptionist] = useState<string>('');
    const [cccd, setCccd] = useState('');
    const [patient, setPatient] = useState<Partial<Patient> | null>(null);
    const [isNewPatient, setIsNewPatient] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [paymentVisit, setPaymentVisit] = useState<Visit | null>(null);

    useEffect(() => {
        fetchReceptionists();
    }, []);

    async function fetchReceptionists() {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('role', 'Receptionist')
            .eq('is_active', true);

        if (data) setReceptionists(data);
    }

    async function handleCancelVisit(visit: Visit) {
        if (!confirm(`Bạn có chắc muốn hủy lượt khám của ${visit.patient?.full_name}?`)) return;

        const { error } = await supabase.from('visits').update({ status: 'Cancelled' }).eq('id', visit.id);

        if (!error) {
            setMessage({ type: 'success', text: 'Đã hủy lượt khám thành công.' });
        } else {
            setMessage({ type: 'error', text: 'Lỗi khi hủy lượt khám.' });
        }
    }

    async function handleRestoreVisit(visit: Visit) {
        if (!confirm(`Khôi phục lượt khám cho ${visit.patient?.full_name}?`)) return;
        const { error } = await supabase.from('visits').update({ status: 'Waiting for Exam' }).eq('id', visit.id);
        if (!error) setMessage({ type: 'success', text: 'Đã khôi phục thành công.' });
        else setMessage({ type: 'error', text: 'Lỗi khôi phục.' });
    }

    async function handleSearchPatient() {
        if (!cccd) return;
        setLoading(true);
        setMessage(null);

        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('cccd', cccd)
            .single();

        if (data) {
            setPatient(data);
            setIsNewPatient(false);
        } else {
            setPatient({ cccd });
            setIsNewPatient(true);
            setMessage({ type: 'error', text: 'Bệnh nhân chưa có trong hệ thống. Vui lòng nhập thông tin mới.' });
        }
        setLoading(false);
    }

    async function handleRegisterAndVisit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedReceptionist) {
            setMessage({ type: 'error', text: 'Vui lòng chọn nhân viên lễ tân trước.' });
            return;
        }

        setLoading(true);
        try {
            let patientId = patient?.id;

            // 1. Register or Update Patient
            if (isNewPatient) {
                const { data, error } = await supabase
                    .from('patients')
                    .insert([patient])
                    .select()
                    .single();
                if (error) throw error;
                patientId = data.id;
            } else if (patientId) {
                // Check if patient already has an active visit
                const { data: activeVisits } = await supabase
                    .from('visits')
                    .select('id, status')
                    .eq('patient_id', patientId)
                    .in('status', ['Waiting for Exam', 'Examing', 'Waiting for Service', 'Return to Doctor', 'Ready for Payment']);

                if (activeVisits && activeVisits.length > 0) {
                    throw new Error(`Bệnh nhân này đang có lượt khám (Trạng thái: ${activeVisits[0].status}). Vui lòng kiểm tra lại.`);
                }
            }

            // 2. Create Visit
            const { error: visitError } = await supabase
                .from('visits')
                .insert([{
                    patient_id: patientId,
                    reception_by: selectedReceptionist,
                    status: 'Waiting for Exam'
                }]);

            if (visitError) throw visitError;

            setMessage({ type: 'success', text: 'Đã đăng ký và đưa vào hàng đợi khám thành công!' });
            resetForm();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setCccd('');
        setPatient(null);
        setIsNewPatient(false);
    }

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <header className="mb-8 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Phân hệ Lễ tân</h1>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Nhân viên trực:</label>
                    <select
                        className="border p-2 rounded-md bg-white"
                        value={selectedReceptionist}
                        onChange={(e) => setSelectedReceptionist(e.target.value)}
                    >
                        <option value="">-- Chọn tên --</option>
                        {receptionists.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            <section className="bg-white p-6 rounded-xl shadow-sm border mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Search size={20} className="text-primary" /> Tiêp nhận bệnh nhân
                </h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Nhập số CCCD..."
                        className="flex-1 border p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        value={cccd}
                        onChange={(e) => setCccd(e.target.value)}
                    />
                    <button
                        onClick={handleSearchPatient}
                        disabled={loading}
                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Đang tìm...' : 'Tìm kiếm'}
                    </button>
                </div>
            </section>

            {patient && (
                <form onSubmit={handleRegisterAndVisit} className="bg-white p-6 rounded-xl shadow-sm border animate-in fade-in duration-300">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        {isNewPatient ? <UserPlus size={20} className="text-success" /> : <FileText size={20} className="text-primary" />}
                        {isNewPatient ? 'Đăng ký bệnh nhân mới' : 'Thông tin bệnh nhân'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Số CCCD</label>
                            <input type="text" value={patient.cccd || ''} readOnly className="w-full p-2 border rounded bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Họ tên *</label>
                            <input
                                type="text"
                                required
                                className="w-full p-2 border rounded"
                                value={patient.full_name || ''}
                                onChange={e => setPatient({ ...patient, full_name: e.target.value })}
                                readOnly={!isNewPatient}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded"
                                value={patient.dob || ''}
                                onChange={e => setPatient({ ...patient, dob: e.target.value })}
                                readOnly={!isNewPatient}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Giới tính</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={patient.gender || ''}
                                onChange={e => setPatient({ ...patient, gender: e.target.value })}
                                disabled={!isNewPatient}
                            >
                                <option value="">Chọn...</option>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={patient.phone || ''}
                                onChange={e => setPatient({ ...patient, phone: e.target.value })}
                                readOnly={!isNewPatient}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={patient.address || ''}
                                onChange={e => setPatient({ ...patient, address: e.target.value })}
                                readOnly={!isNewPatient}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                            {loading ? 'Đang xử lý...' : (isNewPatient ? 'Đăng ký & Khám' : 'Vào hàng đợi khám')}
                        </button>
                    </div>
                </form>
            )}

            {message && (
                <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <p>{message.text}</p>
                </div>
            )}

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <QueueList
                    status="Waiting for Exam"
                    title="Hàng đợi Chờ khám"
                    onCancel={handleCancelVisit}
                />
                <QueueList
                    status="Ready for Payment"
                    title="Chờ Thanh toán"
                    onSelect={(visit) => setPaymentVisit(visit)}
                />
                <QueueList
                    status="Missed"
                    title="Vắng mặt / Đã hủy"
                    onRestore={handleRestoreVisit}
                />
            </div>

            {paymentVisit && (
                <PaymentModal
                    visit={paymentVisit}
                    onClose={() => setPaymentVisit(null)}
                    onConfirm={() => handleProcessPayment(paymentVisit)}
                />
            )}
        </div>
    );

    async function handleProcessPayment(visit: Visit) {
        setLoading(true);
        // In a real app, we might want to store the calculated total amount in DB
        const { error } = await supabase.from('visits').update({
            status: 'Done'
        }).eq('id', visit.id);

        if (!error) {
            setMessage({ type: 'success', text: `Đã thanh toán xong cho ${visit.patient?.full_name}.` });
            setPaymentVisit(null); // Close modal
        } else {
            setMessage({ type: 'error', text: 'Lỗi xử lý thanh toán.' });
        }
        setLoading(false);
    }
}
