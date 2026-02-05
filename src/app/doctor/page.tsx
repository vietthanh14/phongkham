'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff, Visit, Medication, Service } from '@/types';
import { Search, Users, Stethoscope, Beaker, FileText, CheckCircle, XCircle, Printer, Save, History, Plus, ExternalLink } from 'lucide-react';
import PatientHistoryModal from '@/components/PatientHistoryModal';
import QueueList from '@/components/QueueList';

export default function DoctorPage() {
    const [doctors, setDoctors] = useState<Staff[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<string>('');
    const [prescriptions, setPrescriptions] = useState<{ name: string, dose: string, qty: string }[]>([]);
    const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
    const [examNote, setExamNote] = useState({ reason: '', conclusion: '' });
    const [pendingServices, setPendingServices] = useState<string[]>([]);
    const [completedServices, setCompletedServices] = useState<Service[]>([]);
    const [availableMedications, setAvailableMedications] = useState<Medication[]>([]);
    const [availableServices, setAvailableServices] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchDoctors();
        fetchMedications();
        fetchServices();
    }, []);

    async function fetchServices() {
        // Fetch active services, excluding 'Khám bệnh' which is a base fee
        const { data } = await supabase
            .from('service_catalog')
            .select('name')
            .eq('is_active', true)
            .neq('name', 'Khám bệnh')
            .order('name');

        if (data) {
            setAvailableServices(data.map(s => s.name));
        }
    }

    async function fetchDoctors() {
        const { data } = await supabase.from('staff').select('*').eq('role', 'Doctor').eq('is_active', true);
        if (data) setDoctors(data);
    }

    // Auto-restore session when doctor is selected
    useEffect(() => {
        if (!selectedDoctor) return;
        restoreActiveSession();
    }, [selectedDoctor]);

    async function restoreActiveSession() {
        // Find any visit that is currently 'Examing' by this doctor
        const { data } = await supabase
            .from('visits')
            .select(`*, patient:patients(*)`)
            .eq('doctor_by', selectedDoctor)
            .eq('status', 'Examing');

        if (data && data.length === 1) {
            // Only auto-restore if exactly one found. If multiple, let them choose from the "Examing" list.
            handleSelectPatient(data[0]);
            setMessage({ type: 'success', text: `Đã khôi phục phiên khám của ${data[0].patient?.full_name}` });
        } else if (data && data.length > 1) {
            setMessage({ type: 'success', text: `Đang có ${data.length} bệnh nhân đang khám dở. Vui lòng chọn từ danh sách.` });
        }
    }

    async function fetchMedications() {
        // Try fetching active meds
        let { data, error } = await supabase
            .from('medications')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error fetching active meds, trying all...', error);
            // Fallback: If 'is_active' column missing, fetch all
            const res = await supabase.from('medications').select('*').order('name');
            data = res.data;
        }

        if (data) setAvailableMedications(data);
    }

    async function handleSelectPatient(visit: Visit) {
        if (!selectedDoctor) {
            setMessage({ type: 'error', text: 'Vui lòng chọn Tên Bác sĩ trước khi gọi bệnh nhân!' });
            return;
        }

        setActiveVisit(visit);
        setExamNote({ reason: visit.reason || '', conclusion: visit.conclusion || '' });
        setPendingServices([]);

        // Fetch existing prescriptions if any
        const { data: prescriptionData } = await supabase.from('prescriptions').select('*').eq('visit_id', visit.id).single();
        if (prescriptionData) setPrescriptions(prescriptionData.medication_data);
        else setPrescriptions([]);

        // Fetch completed services
        const { data: servicesData } = await supabase
            .from('services')
            .select('*')
            .eq('visit_id', visit.id)
            .in('status', ['Completed', 'Skipped']);

        if (servicesData) setCompletedServices(servicesData);
        else setCompletedServices([]);

        // Update visit status to 'Examing'
        await supabase.from('visits').update({ status: 'Examing', doctor_by: selectedDoctor }).eq('id', visit.id);
    }

    async function handleBatchOrderServices() {
        if (!activeVisit || pendingServices.length === 0) return;
        setLoading(true);

        const servicesToInsert = pendingServices.map(type => ({
            visit_id: activeVisit.id,
            service_type: type,
            status: 'Pending'
        }));

        const { error } = await supabase.from('services').insert(servicesToInsert);

        if (!error) {
            // FORCE UPDATE status to 'Waiting for Service' regardless of current status (Add-on logic)
            await supabase.from('visits').update({ status: 'Waiting for Service', reason: examNote.reason }).eq('id', activeVisit.id);
            setMessage({ type: 'success', text: `Đã chỉ định ${pendingServices.length} dịch vụ thành công!` });
            setPendingServices([]);
            setActiveVisit(null);
        } else {
            setMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu chỉ định.' });
        }
        setLoading(false);
    }

    async function handleCancelVisit() {
        if (!activeVisit) return;
        if (!confirm('Bạn có chắc đánh dấu bệnh nhân này là Vắng mặt/Hủy?')) return;

        const { error } = await supabase.from('visits').update({ status: 'Missed' }).eq('id', activeVisit.id);
        if (!error) {
            setMessage({ type: 'success', text: 'Đã hủy/đánh dấu vắng mặt thành công.' });
            setActiveVisit(null);
        }
    }

    async function saveExamData() {
        if (!activeVisit) return false;
        try {
            // 1. Update Visit Info
            const { error: visitError } = await supabase.from('visits').update({
                reason: examNote.reason,
                conclusion: examNote.conclusion,
                doctor_by: selectedDoctor
            }).eq('id', activeVisit.id);

            if (visitError) throw visitError;

            // 2. Save Prescription
            if (prescriptions.length > 0) {
                // Check if exists first because 'visit_id' does not have UNIQUE constraint in DB
                const { data: existingPresc } = await supabase
                    .from('prescriptions')
                    .select('id')
                    .eq('visit_id', activeVisit.id)
                    .single();

                let prescError;
                if (existingPresc) {
                    const { error } = await supabase
                        .from('prescriptions')
                        .update({ medication_data: prescriptions })
                        .eq('visit_id', activeVisit.id);
                    prescError = error;
                } else {
                    const { error } = await supabase
                        .from('prescriptions')
                        .insert([{
                            visit_id: activeVisit.id,
                            medication_data: prescriptions
                        }]);
                    prescError = error;
                }

                if (prescError) throw prescError;
            }

            return true;
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Lỗi lưu dữ liệu: ' + err.message });
            return false;
        }
    }

    async function handleSaveExam() {
        if (!selectedDoctor) {
            setMessage({ type: 'error', text: 'Vui lòng chọn bác sĩ.' });
            return;
        }
        setLoading(true);
        const success = await saveExamData();
        if (success) {
            setMessage({ type: 'success', text: 'Đã lưu dữ liệu khám bệnh.' });
        }
        setLoading(false);
    }

    async function handlePrintPrescription() {
        if (!selectedDoctor) {
            setMessage({ type: 'error', text: 'Vui lòng chọn bác sĩ.' });
            return;
        }
        setLoading(true);
        // Save first to ensure data is consistent
        const success = await saveExamData();
        if (success) {
            // TODO: Open Print Window / Generate PDF
            // For now, simple alert or window.print() placeholder
            window.open(`/print/prescription/${activeVisit?.id}`, '_blank');
        }
        setLoading(false);
    }

    async function handleFinishExam() {
        if (!activeVisit) return;
        if (!confirm('Hoàn tất lượt khám và chuyển bệnh nhân sang thanh toán?')) return;

        setLoading(true);
        const success = await saveExamData();
        if (success) {
            const { error } = await supabase.from('visits').update({
                status: 'Ready for Payment'
            }).eq('id', activeVisit.id);

            if (!error) {
                setMessage({ type: 'success', text: 'Đã hoàn tất lượt khám. Chuyển thanh toán.' });
                setActiveVisit(null);
            } else {
                setMessage({ type: 'error', text: 'Lỗi cập nhật trạng thái.' });
            }
        }
        setLoading(false);
    }

    async function handleMarkMissed() {
        if (!activeVisit) return;
        await supabase.from('visits').update({ status: 'Missed' }).eq('id', activeVisit.id);
        setActiveVisit(null);
        setMessage({ type: 'success', text: 'Đã đánh dấu bệnh nhân vắng mặt.' });
    }

    // Auto-dismiss message after 3 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    return (
        <div className="container mx-auto p-4 flex flex-col h-screen max-h-screen overflow-hidden relative">
            <header className="mb-4 flex justify-between items-center shrink-0">
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Stethoscope /> Phân hệ Bác sĩ
                </h1>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Bác sĩ khám:</label>
                    <select
                        className="border p-1.5 rounded-md bg-white text-sm"
                        value={selectedDoctor}
                        onChange={(e) => setSelectedDoctor(e.target.value)}
                    >
                        <option value="">-- Chọn bác sĩ --</option>
                        {doctors.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="flex gap-4 flex-1 overflow-hidden">
                {/* Left Sidebar: Queues */}
                <div className="w-80 flex flex-col gap-4 overflow-y-auto shrink-0 pr-2">
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                        <h3 className="text-sm font-bold mb-2 text-gray-500 uppercase flex items-center gap-1">
                            <Users size={14} /> Hàng đợi khám
                        </h3>

                        {/* My Active Patients List */}
                        {selectedDoctor && (
                            <QueueList
                                status="Examing"
                                title="Đang khám (Của tôi)"
                                onSelect={handleSelectPatient}
                                filterDoctor={selectedDoctor} // We need to add this prop to QueueList
                                className="h-auto shadow-none border-none !bg-transparent"
                            />
                        )}

                        <div className="mt-4">
                            <QueueList
                                status="Waiting for Exam"
                                title="Khám mới"
                                onSelect={handleSelectPatient}
                                className="h-auto shadow-none border-none !bg-transparent"
                            />
                        </div>
                        <div className="mt-4">
                            <QueueList
                                status="Return to Doctor"
                                title="Quay lại (Có KQ)"
                                onSelect={handleSelectPatient}
                                className="h-auto shadow-none border-none !bg-transparent"
                            />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-3 mt-auto">
                        <h3 className="text-sm font-bold mb-2 text-gray-500 uppercase flex items-center gap-1">
                            <History size={14} /> Bệnh nhân vừa khám
                        </h3>
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {selectedDoctor ? (
                                <QueueList
                                    status="Ready for Payment"
                                    title="Chờ t.toán (Vừa xong)"
                                    onSelect={handleSelectPatient}
                                    filterDoctor={selectedDoctor}
                                    className="h-full shadow-none border-none !bg-transparent" // Keep h-full here as it is only child
                                />
                            ) : (
                                <p className="text-xs text-gray-400 text-center italic mt-4">Chọn bác sĩ để xem lịch sử</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content: Examination */}
                <div className="flex-1 bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
                    {/* ... if no activeVisit ... */}
                    {!activeVisit ? (
                        // ...
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                            <Stethoscope size={48} strokeWidth={1} className="mb-2" />
                            <p>Chọn một bệnh nhân từ hàng đợi để bắt đầu khám</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* ... header activeVisit ... */}
                            <div className="p-4 border-b flex justify-between items-center bg-blue-50/30">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">{activeVisit.patient?.full_name}</h2>
                                    <div className="text-xs text-gray-500 flex gap-4">
                                        <span>CCCD: {activeVisit.patient?.cccd}</span>
                                        <span>Tuổi: {activeVisit.patient?.dob ? new Date().getFullYear() - new Date(activeVisit.patient.dob).getFullYear() : 'N/A'}</span>
                                        <span>GT: {activeVisit.patient?.gender}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleMarkMissed} className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 text-sm border border-red-100">
                                        <XCircle size={16} /> Vắng mặt
                                    </button>
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 text-sm border border-blue-100"
                                    >
                                        <History size={16} /> Xem bệnh sử
                                    </button>
                                </div>
                            </div>

                            {/* ... Content ... */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* ... Note ... */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-600 mb-1">Lý do khám / Triệu chứng</label>
                                        <textarea
                                            className="w-full border rounded-lg p-3 h-24 focus:ring-2 focus:ring-primary outline-none"
                                            value={examNote.reason}
                                            onChange={e => setExamNote({ ...examNote, reason: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-600 mb-1">Kết luận / Chẩn đoán</label>
                                        <textarea
                                            className="w-full border rounded-lg p-3 h-24 focus:ring-2 focus:ring-primary outline-none"
                                            value={examNote.conclusion}
                                            onChange={e => setExamNote({ ...examNote, conclusion: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* ... Service Orders ... */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
                                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <Beaker size={16} /> Chỉ định cận lâm sàng
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {availableServices.length === 0 && <p className="text-sm text-gray-500 italic col-span-3">Đang tải danh sách dịch vụ...</p>}
                                        {availableServices.map((service) => (
                                            <label key={service} className="flex items-center gap-2 bg-white border p-3 rounded-lg cursor-pointer hover:border-primary transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                                                    checked={pendingServices.includes(service)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setPendingServices([...pendingServices, service]);
                                                        else setPendingServices(pendingServices.filter(s => s !== service));
                                                    }}
                                                />
                                                <span className="text-sm font-medium">{service}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {pendingServices.length > 0 && (
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={handleBatchOrderServices}
                                                disabled={loading}
                                                className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                                            >
                                                <Plus size={16} /> Chỉ định {pendingServices.length} dịch vụ đã chọn
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* ... Completed Services ... */}
                                {completedServices.length > 0 && (
                                    <div className="bg-green-50 rounded-lg p-4 border border-green-200 animate-in fade-in slide-in-from-bottom-5">
                                        <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                                            <CheckCircle size={16} /> Kết quả Cận lâm sàng
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            {completedServices.map(service => (
                                                <div key={service.id} className="bg-white p-4 rounded-lg border border-green-100 shadow-sm flex gap-4">
                                                    {service.image_url && (
                                                        <div className="shrink-0 flex flex-col items-center gap-1">
                                                            <a href={service.image_url} target="_blank" rel="noopener noreferrer" className="block">
                                                                <img
                                                                    src={service.image_url}
                                                                    alt="Kết quả"
                                                                    className="w-32 h-32 object-cover rounded-lg border hover:opacity-90 transition-opacity bg-gray-100"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/150?text=Lỗi+Ảnh';
                                                                        (e.target as HTMLImageElement).style.objectFit = 'contain';
                                                                    }}
                                                                />
                                                            </a>
                                                            <a href={service.image_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                                <ExternalLink size={10} /> Xem ảnh gốc
                                                            </a>
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-bold text-gray-800">{service.service_type}</span>
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">
                                                                Thực hiện bởi: {service.tech_by}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-100">
                                                            {service.result_text || 'Chưa có mô tả kết quả.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ... Prescriptions ... */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <FileText size={16} /> Kê đơn thuốc
                                    </h3>
                                    <div className="space-y-2">
                                        {prescriptions.map((p, i) => (
                                            <div key={i} className="flex gap-2 items-center bg-white p-2 border rounded-lg animate-in slide-in-from-left-2 duration-200">
                                                <input
                                                    list="meds"
                                                    placeholder="Tên thuốc..."
                                                    className="flex-[2] border-none focus:ring-0 text-sm"
                                                    value={p.name}
                                                    onChange={e => {
                                                        const newP = [...prescriptions];
                                                        newP[i].name = e.target.value;
                                                        setPrescriptions(newP);
                                                    }}
                                                />
                                                <input
                                                    placeholder="Liều dùng (VD: 2v/ngày)"
                                                    className="flex-[1] border-none focus:ring-0 text-sm italic text-gray-500"
                                                    value={p.dose}
                                                    onChange={e => {
                                                        const newP = [...prescriptions];
                                                        newP[i].dose = e.target.value;
                                                        setPrescriptions(newP);
                                                    }}
                                                />
                                                <input
                                                    placeholder="Số lượng"
                                                    className="w-20 border-none focus:ring-0 text-sm text-center font-bold"
                                                    value={p.qty}
                                                    onChange={e => {
                                                        const newP = [...prescriptions];
                                                        newP[i].qty = e.target.value;
                                                        setPrescriptions(newP);
                                                    }}
                                                />
                                                <button onClick={() => setPrescriptions(prescriptions.filter((_, idx) => idx !== i))} className="p-1 text-gray-300 hover:text-red-500">
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setPrescriptions([...prescriptions, { name: '', dose: '', qty: '' }])}
                                            className="text-primary text-sm flex items-center gap-1 hover:underline p-1"
                                        >
                                            <Plus size={14} /> Thêm thuốc
                                        </button>
                                        <datalist id="meds">
                                            {availableMedications.map(m => (
                                                <option key={m.id} value={m.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                            </div>

                            {/* ... Footer Actions ... */}
                            <div className="p-4 border-t bg-gray-50 flex justify-between items-center shrink-0">
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveExam}
                                        disabled={loading}
                                        className="bg-white border border-gray-200 px-4 py-2 rounded-lg hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                                    >
                                        <Save size={18} /> Lưu Nháp
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handlePrintPrescription}
                                        disabled={loading}
                                        className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        <Printer size={18} /> In Đơn Thuốc
                                    </button>

                                    <button
                                        onClick={handleFinishExam}
                                        disabled={loading || !selectedDoctor}
                                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md shadow-blue-200 disabled:opacity-50"
                                    >
                                        <CheckCircle size={18} /> Hoàn tất Khám
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {message && (
                <div
                    className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-5 z-50 cursor-pointer ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                    onClick={() => setMessage(null)}
                >
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <div className="flex-1">
                        <p className="font-medium">{message.text}</p>
                        <p className="text-xs opacity-80 mt-1">Bấm để đóng</p>
                    </div>
                    <XCircle size={18} className="opacity-50 hover:opacity-100" />
                </div>
            )}

            {showHistory && activeVisit?.patient && (
                <PatientHistoryModal
                    patient={activeVisit.patient as any} // Cast safely as we know it's a patient object
                    onClose={() => setShowHistory(false)}
                />
            )}
        </div>
    );
}

// Minimalist alert icon for footer
function AlertCircle({ size }: { size: number }) {
    return <XCircle size={size} />;
}
