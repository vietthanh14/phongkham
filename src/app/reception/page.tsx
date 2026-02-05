'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff, Patient, Visit } from '@/types';
import { Search, UserPlus, FileText } from 'lucide-react';
import QueueList from '@/components/QueueList';
import PaymentModal from '@/components/PaymentModal';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';

export default function ReceptionPage() {
    const [receptionists, setReceptionists] = useState<Staff[]>([]);
    const [selectedReceptionist, setSelectedReceptionist] = useState<string>('');
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);

    const [patient, setPatient] = useState<Partial<Patient> | null>(null);
    const [isNewPatient, setIsNewPatient] = useState(false);
    const [loading, setLoading] = useState(false);
    const [paymentVisit, setPaymentVisit] = useState<Visit | null>(null);
    const [isEditing, setIsEditing] = useState(false); // State for Edit mode

    // Patient History State
    const [patientHistory, setPatientHistory] = useState<Visit[]>([]);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        confirmText?: string; // Add optional property
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    useEffect(() => {
        fetchReceptionists();
    }, []);


    async function fetchPatientHistory(patientId: string) {
        if (!patientId) return;
        const { data, error } = await supabase
            .from('visits')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(3);

        if (data) setPatientHistory(data);
    }

    async function fetchReceptionists() {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('role', 'Receptionist')
            .eq('is_active', true);

        if (data) setReceptionists(data);
    }

    async function handleCancelVisit(visit: Visit) {
        if (!selectedReceptionist) {
            toast.error('Vui lòng chọn nhân viên lễ tân thao tác.');
            return;
        }
        if (!selectedReceptionist) {
            toast.error('Vui lòng chọn nhân viên lễ tân thao tác.');
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận hủy',
            message: `Bạn có chắc muốn hủy lượt khám của ${visit.patient?.full_name}?`,
            type: 'warning',
            onConfirm: async () => {
                const { error } = await supabase.from('visits').update({ status: 'Missed' }).eq('id', visit.id);
                if (!error) {
                    toast.success('Đã hủy lượt khám thành công.');
                } else {
                    console.error(error);
                    toast.error('Lỗi khi hủy lượt khám: ' + error.message);
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    }

    async function handlePrioritize(visit: Visit) {
        // Toggle priority or set to true
        const { error } = await supabase
            .from('visits')
            .update({ is_priority: true })
            .eq('id', visit.id);

        if (!error) {
            toast.success(`Đã ưu tiên lượt khám của ${visit.patient?.full_name}`);
        } else {
            toast.error('Lỗi khi ưu tiên: ' + error.message);
        }
    }

    async function handleRestoreVisit(visit: Visit) {
        if (!selectedReceptionist) {
            toast.error('Vui lòng chọn nhân viên lễ tân thao tác.');
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận khôi phục',
            message: `Khôi phục lượt khám cho ${visit.patient?.full_name}?`,
            type: 'info',
            onConfirm: async () => {
                const { error } = await supabase.from('visits').update({ status: 'Waiting for Exam' }).eq('id', visit.id);
                if (!error) {
                    toast.success('Đã khôi phục thành công.');
                }
                else toast.error('Lỗi khôi phục.');
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    }

    async function handleSearchPatient() {
        if (!selectedReceptionist) {
            toast.error('Vui lòng chọn nhân viên lễ tân để tìm kiếm.');
            return;
        }
        if (!searchQuery.trim()) return;
        setLoading(true);

        setSearchResults([]); // Reset searching

        // Search across multiple fields
        // Note: For 'ilike' to work with multiple OR conditions, we can use the syntax:
        // column.ilike.value,column2.eq.value
        // But simpler for this use case:
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .or(`cccd.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
            .limit(5);

        if (error) {
            console.error(error);
            toast.error('Lỗi tìm kiếm.');
            setLoading(false);
            return;
        }

        if (data && data.length > 0) {
            if (data.length === 1) {
                // Exact match or single result
                setPatient(data[0]);
                setIsNewPatient(false);
                setIsEditing(false); // Default to view only
                setSearchResults([]);
                fetchPatientHistory(data[0].id);
            } else {
                // Multiple results - show list for user to pick
                setSearchResults(data);
                setPatient(null); // Clear form temporarily until selected
                setIsEditing(false);
                toast.success(`Tìm thấy ${data.length} bệnh nhân. Vui lòng chọn bên dưới.`);
            }
        } else {
            // No results found - Prepare for new patient
            // Guess if query is CCCD or Phone to pre-fill?
            const isNumber = /^\d+$/.test(searchQuery);
            setPatient({
                cccd: isNumber && searchQuery.length >= 9 ? searchQuery : '',
                phone: isNumber && searchQuery.length <= 11 ? searchQuery : '',
                full_name: !isNumber ? searchQuery : ''
            });
            setIsNewPatient(true);
            setSearchResults([]);
            toast.info('Chưa có thông tin. Vui lòng nhập mới.');
        }
        setLoading(false);
    }

    function handleForceCreate() {
        if (!selectedReceptionist) {
            toast.error('Vui lòng chọn nhân viên lễ tân trước khi tạo mới.');
            return;
        }
        // Initialize new patient with current search query if applicable
        const isNumber = /^\d+$/.test(searchQuery);
        setPatient({
            cccd: isNumber && searchQuery.length >= 9 ? searchQuery : '',
            phone: isNumber && searchQuery.length <= 11 ? searchQuery : '',
            full_name: !isNumber ? searchQuery : ''
        });
        setIsNewPatient(true);
        setIsEditing(true); // New patient is always editing
        setSearchResults([]);
        // Toast not needed here, form opens
    }

    function selectPatientFromSearch(p: Patient) {
        setPatient(p);
        setIsNewPatient(false);
        setIsEditing(false); // View mode initially
        setSearchResults([]);
        fetchPatientHistory(p.id);
    }

    // ... (handleRegisterAndVisit remains mostly same, just check 'patient' is valid)

    // ... (resetForm update)
    function resetForm() {
        setSearchQuery('');
        setSearchResults([]);
        setPatient(null);
        setIsNewPatient(false);
        setIsEditing(false);
        setPatientHistory([]);
    }

    // CRUD Operations: Update & Delete
    async function handleUpdatePatient() {
        if (!patient || !patient.id) return;
        setLoading(true);
        const { error } = await supabase
            .from('patients')
            .update({
                full_name: patient.full_name,
                phone: patient.phone,
                dob: patient.dob,
                gender: patient.gender,
                address: patient.address,
                cccd: patient.cccd
            })
            .eq('id', patient.id);

        if (error) {
            toast.error('Lỗi cập nhật: ' + error.message);
        } else {
            toast.success('Cập nhật thông tin thành công!');
            setIsEditing(false);
        }
        setLoading(false);
    }

    async function handleDeletePatient() {
        if (!patient || !patient.id) return;

        setConfirmModal({
            isOpen: true,
            title: 'CẢNH BÁO XÓA BỆNH NHÂN',
            message: 'Bạn có chắc muốn XÓA hoàn toàn bệnh nhân này? Thao tác này không thể hoàn tác.',
            type: 'danger',
            confirmText: 'Xóa vĩnh viễn',
            onConfirm: async () => {
                setLoading(true);
                const { error } = await supabase.from('patients').delete().eq('id', patient.id);
                if (error) {
                    toast.error('Không thể xóa (có thể do bệnh nhân đã có lịch sử khám).');
                } else {
                    toast.success('Đã xóa bệnh nhân.');
                    resetForm();
                }
                setLoading(false);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    }

    async function handleRegisterAndVisit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedReceptionist) {
            toast.error('Vui lòng chọn nhân viên lễ tân trước.');
            return;
        }

        setLoading(true);
        try {
            let patientId = patient?.id;

            // 1. Register or Update Patient
            if (isNewPatient) {
                let patientData = { ...patient };

                const { data, error } = await supabase
                    .from('patients')
                    .insert([patientData])
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

            toast.success('Đã đăng ký và đưa vào hàng đợi khám thành công!');
            resetForm();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }



    // Tab state
    const [activeTab, setActiveTab] = useState<'waiting' | 'examing' | 'service' | 'payment' | 'missed'>('waiting');

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
                <div className="flex flex-col gap-4 relative">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nhập tên, số ĐT hoặc CCCD..."
                            className="flex-1 border p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
                        />
                        <button
                            onClick={handleSearchPatient}
                            disabled={loading}
                            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
                        </button>
                        <button
                            onClick={handleForceCreate}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                            title="Tạo bệnh nhân mới (không cần tìm)"
                        >
                            <UserPlus size={18} /> Thêm mới
                        </button>
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-2 absolute top-full left-0 right-0 z-20 mt-1 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-50">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Kết quả tìm kiếm ({searchResults.length})</p>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto mt-1">
                                {searchResults.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => selectPatientFromSearch(p)}
                                        className="p-3 hover:bg-blue-50 rounded-lg cursor-pointer flex justify-between items-center group transition-colors"
                                    >
                                        <div>
                                            <div className="font-bold text-gray-800 group-hover:text-blue-700">{p.full_name}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span>{p.gender}</span>
                                                <span>•</span>
                                                <span>{p.dob}</span>
                                                {p.phone && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{p.phone}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                                            {p.cccd}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {patient && (
                <form onSubmit={handleRegisterAndVisit} className="bg-white p-6 rounded-xl shadow-sm border animate-in fade-in duration-300">
                    <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isNewPatient ? <UserPlus size={20} className="text-success" /> : <FileText size={20} className="text-primary" />}
                            {isNewPatient ? 'Đăng ký bệnh nhân mới' : 'Thông tin bệnh nhân'}
                        </div>
                        {!isNewPatient && (
                            <div className="flex gap-2">
                                {!isEditing ? (
                                    <>
                                        <button type="button" onClick={() => setIsEditing(true)} className="text-blue-600 text-sm hover:underline font-bold">Sửa thông tin</button>
                                        <button type="button" onClick={handleDeletePatient} className="text-red-500 text-sm hover:underline font-bold ml-2">Xóa</button>
                                    </>
                                ) : (
                                    <button type="button" onClick={() => setIsEditing(false)} className="text-gray-500 text-sm hover:underline">Hủy sửa</button>
                                )}
                            </div>
                        )}
                    </h2>

                    {/* Quick History Tooltip/Panel */}
                    {patientHistory.length > 0 && !isNewPatient && (
                        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                            <h3 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                                <FileText size={16} /> Lịch sử khám gần nhất
                            </h3>
                            <div className="space-y-2">
                                {patientHistory.map(h => (
                                    <div key={h.id} className="text-xs text-gray-600 border-b border-blue-100 last:border-0 pb-1 last:pb-0">
                                        <span className="font-semibold">{new Date(h.created_at).toLocaleDateString('vi-VN')}</span>: {h.reason || 'Không có lý do'}
                                        {h.conclusion && <span className="italic"> - {h.conclusion}</span>}
                                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${h.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                            {h.status === 'Done' ? 'Hoàn thành' : h.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Số CCCD</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={patient.cccd || ''}
                                onChange={e => setPatient({ ...patient, cccd: e.target.value })}
                                readOnly={!isNewPatient && !isEditing}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Họ tên *</label>
                            <input
                                type="text"
                                required
                                className="w-full p-2 border rounded"
                                value={patient.full_name || ''}
                                onChange={e => setPatient({ ...patient, full_name: e.target.value })}
                                readOnly={!isNewPatient && !isEditing}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded"
                                value={patient.dob || ''}
                                onChange={e => setPatient({ ...patient, dob: e.target.value })}
                                readOnly={!isNewPatient && !isEditing}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Giới tính</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={patient.gender || ''}
                                onChange={e => setPatient({ ...patient, gender: e.target.value })}
                                disabled={!isNewPatient && !isEditing}
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
                                readOnly={!isNewPatient && !isEditing}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={patient.address || ''}
                                onChange={e => setPatient({ ...patient, address: e.target.value })}
                                readOnly={!isNewPatient && !isEditing}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Đóng
                        </button>

                        {/* Show different buttons based on state */}
                        {isNewPatient ? (
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                            >
                                {loading ? 'Đang xử lý...' : 'Đăng ký & Khám'}
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleUpdatePatient}
                                        disabled={loading}
                                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                                    >
                                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading || isEditing}
                                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Đang xử lý...' : 'Vào hàng đợi khám'}
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            )}

            {/* Tab Navigation */}
            <div className="mt-12 mb-6 flex gap-4 border-b border-gray-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('waiting')}
                    className={`pb-3 px-4 text-sm font-bold transition-all relative ${activeTab === 'waiting'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Chờ khám
                </button>
                <button
                    onClick={() => setActiveTab('examing')}
                    className={`pb-3 px-4 text-sm font-bold transition-all relative ${activeTab === 'examing'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Đang khám
                </button>
                <button
                    onClick={() => setActiveTab('service')}
                    className={`pb-3 px-4 text-sm font-bold transition-all relative ${activeTab === 'service'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Cận lâm sàng
                </button>
                <button
                    onClick={() => setActiveTab('payment')}
                    className={`pb-3 px-4 text-sm font-bold transition-all relative ${activeTab === 'payment'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Chờ thanh toán
                </button>
                <button
                    onClick={() => setActiveTab('missed')}
                    className={`pb-3 px-4 text-sm font-bold transition-all relative ${activeTab === 'missed'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Vắng mặt / Đã hủy
                </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'waiting' && (
                    <div className="animate-in fade-in duration-300">
                        <QueueList
                            status="Waiting for Exam"
                            title="Hàng đợi Chờ khám"
                            onCancel={handleCancelVisit}
                            onPrioritize={handlePrioritize}
                        />
                    </div>
                )}
                {activeTab === 'examing' && (
                    <div className="animate-in fade-in duration-300">
                        <QueueList
                            status="Examing"
                            title="Bệnh nhân Đang khám"
                        // No actions for reception
                        />
                    </div>
                )}
                {activeTab === 'service' && (
                    <div className="animate-in fade-in duration-300">
                        <QueueList
                            status="Waiting for Service"
                            title="Bệnh nhân Chờ Dịch vụ"
                        // No actions for reception
                        />
                    </div>
                )}
                {activeTab === 'payment' && (
                    <div className="animate-in fade-in duration-300">
                        <QueueList
                            status="Ready for Payment"
                            title="Hàng đợi Chờ Thanh toán"
                            onSelect={(visit) => setPaymentVisit(visit)}
                        />
                    </div>
                )}
                {activeTab === 'missed' && (
                    <div className="animate-in fade-in duration-300">
                        <QueueList
                            status="Missed"
                            title="Danh sách Vắng mặt / Đã hủy"
                            onRestore={handleRestoreVisit}
                        />
                    </div>
                )}
            </div>

            {paymentVisit && (
                <PaymentModal
                    visit={paymentVisit}
                    onClose={() => setPaymentVisit(null)}
                    onConfirm={() => handleProcessPayment(paymentVisit)}
                />
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );

    async function handleProcessPayment(visit: Visit) {
        if (!selectedReceptionist) {
            toast.error('Vui lòng chọn nhân viên thu ngân/lễ tân.');
            return;
        }
        setLoading(true);
        // In a real app, we might want to store the calculated total amount in DB
        const { error } = await supabase.from('visits').update({
            status: 'Done',
            reception_by: selectedReceptionist // Update who processed payment if needed, or keep original? 
            // Usually payment might be done by someone else, but 'reception_by' is often creator. 
            // Let's just ensure they are selected. 
        }).eq('id', visit.id);

        if (!error) {
            toast.success(`Đã thanh toán xong cho ${visit.patient?.full_name}.`);
            setPaymentVisit(null); // Close modal
        } else {
            toast.error('Lỗi xử lý thanh toán.');
        }
        setLoading(false);
    }
}

