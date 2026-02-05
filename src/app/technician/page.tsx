'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff, Visit, Service } from '@/types';
import { Beaker, Camera, FileText, CheckCircle, Clock, Search, User, XCircle } from 'lucide-react';
import QueueList from '@/components/QueueList';

export default function TechnicianPage() {
    const [techs, setTechs] = useState<Staff[]>([]);
    const [selectedTech, setSelectedTech] = useState<string>('');
    const [serviceTypes, setServiceTypes] = useState<string[]>([]);

    // State mới: Quản lý Visit đang chọn và Danh sách dịch vụ của Visit đó
    const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
    const [visitServices, setVisitServices] = useState<Service[]>([]);
    const [editingService, setEditingService] = useState<Service | null>(null); // Dịch vụ đang nhập KQ
    const [filterTab, setFilterTab] = useState('Tất cả');

    const [resultText, setResultText] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchTechs();
        fetchServiceTypes();
    }, []);

    async function fetchServiceTypes() {
        const { data } = await supabase
            .from('service_catalog')
            .select('name')
            .eq('is_active', true)
            .neq('name', 'Khám bệnh') // Usually Techs don't process "Exam"
            .order('name');

        if (data) {
            setServiceTypes(['Tất cả', ...data.map(s => s.name)]);
        } else {
            setServiceTypes(['Tất cả']);
        }
    }

    async function fetchTechs() {
        const { data } = await supabase.from('staff').select('*').eq('role', 'Technician').eq('is_active', true);
        if (data) setTechs(data);
    }

    // 1. Khi chọn bệnh nhân từ hàng đợi -> Load danh sách dịch vụ
    async function handleSelectPatient(visit: Visit) {
        setActiveVisit(visit);
        setEditingService(null); // Reset form đang sửa

        // Fetch all services for this visit
        const { data } = await supabase
            .from('services')
            .select('*')
            .eq('visit_id', visit.id)
            .order('created_at'); // Xếp theo thứ tự tạo

        if (data) {
            setVisitServices(data);
        }
    }

    // 2. Khi bấm chọn 1 dịch vụ cụ thể để làm
    function handleSelectServiceToPerform(service: Service) {
        setEditingService(service);
        setResultText(service.result_text || '');
    }

    // 3. Lưu kết quả của 1 dịch vụ
    async function handleSaveResult() {
        if (!activeVisit || !editingService || !selectedTech) {
            setMessage({ type: 'error', text: 'Vui lòng chọn kỹ thuật viên và dịch vụ.' });
            return;
        }
        setLoading(true);

        let finalImageUrl = editingService.image_url;

        // 1. Upload logic if file selected
        const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();

            try {
                const uploadPromise = new Promise<string>(async (resolve, reject) => {
                    reader.onload = async (e) => {
                        const base64Content = e.target?.result as string;
                        try {
                            // Call Google Apps Script with CORS enabled (default)
                            const response = await fetch(process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!, {
                                method: 'POST',
                                body: JSON.stringify({
                                    file: base64Content,
                                    fileName: `${activeVisit.patient?.cccd}_${editingService.service_type}_${Date.now()}.jpg`
                                })
                            });

                            if (!response.ok) {
                                throw new Error('Network response was not ok');
                            }

                            const responseData = await response.json();
                            if (responseData.status === 'success') {
                                // Use lh3 link for better embedding support (requires public access which we set)
                                // Fallback to provided URL if ID missing
                                const directUrl = responseData.id ? `https://lh3.googleusercontent.com/d/${responseData.id}` : responseData.url;
                                resolve(directUrl);
                            } else {
                                reject(responseData.message || 'Upload failed at script');
                            }
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                finalImageUrl = await uploadPromise;
            } catch (err) {
                console.error("Upload failed", err);
                setMessage({ type: 'error', text: "Lỗi upload ảnh: Có thể do mạng hoặc tập lệnh chưa cấp quyền. Hãy thử lại." });
                setLoading(false);
                return;
            }
        }

        // 2. Update Service
        const { error } = await supabase.from('services').update({
            result_text: resultText,
            image_url: finalImageUrl,
            tech_by: selectedTech,
            status: 'Completed'
        }).eq('id', editingService.id);

        if (!error) {
            checkAndCompleteVisit('Completed');
        } else {
            setMessage({ type: 'error', text: 'Lỗi khi lưu kết quả.' });
        }
        setLoading(false);
    }

    async function handleSkipService() {
        if (!activeVisit || !editingService || !selectedTech) return;
        if (!confirm(`Xác nhận bỏ qua dịch vụ ${editingService.service_type}?`)) return;

        setLoading(true);
        const { error } = await supabase.from('services').update({
            status: 'Skipped',
            tech_by: selectedTech,
            result_text: 'Đã bỏ qua / Không thực hiện'
        }).eq('id', editingService.id);

        if (!error) {
            checkAndCompleteVisit('Skipped');
        } else {
            setMessage({ type: 'error', text: 'Lỗi khi bỏ qua dịch vụ.' });
        }
        setLoading(false);
    }

    async function checkAndCompleteVisit(lastAction: 'Completed' | 'Skipped') {
        if (!activeVisit || !editingService) return;

        const updatedServices = visitServices.map(s =>
            s.id === editingService.id ? { ...s, status: lastAction } : s
        );
        setVisitServices(updatedServices as Service[]);

        // Check if ANY service is still Pending
        const hasPending = updatedServices.some(s => s.status === 'Pending');

        if (!hasPending) {
            await supabase.from('visits').update({ status: 'Return to Doctor' }).eq('id', activeVisit.id);
            setMessage({ type: 'success', text: 'Đã xử lý xong hết các dịch vụ. Bệnh nhân chuyển về bác sĩ.' });
            setActiveVisit(null);
            setEditingService(null);
        } else {
            setMessage({ type: 'success', text: `Đã cập nhật trạng thái: ${lastAction === 'Completed' ? 'Hoàn thành' : 'Bỏ qua'}.` });
            setEditingService(null);
        }
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
                    <Beaker /> Phân hệ Kỹ thuật viên
                </h1>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Kỹ thuật viên:</label>
                    <select
                        className="border p-1.5 rounded-md bg-white text-sm"
                        value={selectedTech}
                        onChange={(e) => setSelectedTech(e.target.value)}
                    >
                        <option value="">-- Chọn tên --</option>
                        {techs.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="flex gap-4 flex-1 overflow-hidden">
                {/* Left: Service Queue */}
                <div className="w-80 shrink-0 overflow-hidden flex flex-col gap-2">
                    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                        {serviceTypes.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilterTab(tab)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterTab === tab
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-white text-gray-600 border hover:bg-gray-50'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <QueueList
                            status="Waiting for Service"
                            title={`Hàng đợi ${filterTab}`}
                            onSelect={handleSelectPatient}
                            filterServiceType={filterTab}
                        />
                    </div>
                </div>

                {/* Right: Patient & Services List */}
                <div className="flex-1 bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
                    {!activeVisit ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                            <Camera size={48} strokeWidth={1} className="mb-2" />
                            <p>Chọn bệnh nhân từ hàng đợi để xem chỉ định</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Patient Header */}
                            <div className="p-4 border-b bg-purple-50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <User size={20} className="text-purple-600" />
                                        {activeVisit.patient?.full_name}
                                    </h2>
                                    <p className="text-sm text-gray-500 ml-7">CCCD: {activeVisit.patient?.cccd} - {activeVisit.patient?.gender}</p>
                                </div>
                                <button onClick={() => setActiveVisit(null)} className="text-gray-400 hover:text-gray-600 font-bold">Đóng</button>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                {/* Service List Selection */}
                                <div className="w-1/3 border-r overflow-y-auto p-2 bg-gray-50">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">Danh sách chỉ định</h3>
                                    <div className="space-y-2">
                                        {visitServices.map(service => (
                                            <div
                                                key={service.id}
                                                onClick={() => handleSelectServiceToPerform(service)}
                                                className={`p-3 rounded-lg cursor-pointer border transition-all ${editingService?.id === service.id
                                                    ? 'bg-white border-primary shadow-md'
                                                    : 'bg-white border-gray-200 hover:border-purple-300'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-gray-700">{service.service_type}</span>
                                                    {service.status === 'Completed' ? (
                                                        <span className="text-green-600"><CheckCircle size={16} /></span>
                                                    ) : (
                                                        <span className="text-orange-500"><Clock size={16} /></span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                    {service.status === 'Completed'
                                                        ? `✅ Xong bởi: ${service.tech_by}`
                                                        : '⏳ Chưa thực hiện'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Editing Form */}
                                <div className="flex-1 p-6 overflow-y-auto bg-white">
                                    {!editingService ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                            <p>Chọn một dịch vụ bên trái để nhập kết quả</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <h3 className="text-xl font-bold text-primary border-b pb-2">
                                                Kết quả: {editingService.service_type}
                                            </h3>

                                            <div className="space-y-2">
                                                <label className="block text-sm font-bold text-gray-700">Mô tả / Kết luận</label>
                                                <textarea
                                                    className="w-full border p-3 rounded-lg min-h-[100px] mb-4 focus:ring-2 focus:ring-primary outline-none"
                                                    placeholder="Nhập mô tả kết quả..."
                                                    value={resultText}
                                                    onChange={e => setResultText(e.target.value)}
                                                ></textarea>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-sm font-bold text-gray-700">Tải ảnh kết quả (nếu có)</label>
                                                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                                    <input
                                                        type="file"
                                                        id="fileUpload"
                                                        accept="image/*"
                                                        className="block w-full text-sm text-gray-500
                                                        file:mr-4 file:py-2 file:px-4
                                                        file:rounded-full file:border-0
                                                        file:text-sm file:font-semibold
                                                        file:bg-blue-50 file:text-blue-700
                                                        hover:file:bg-blue-100"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4 flex justify-end gap-3">
                                                <button
                                                    onClick={handleSkipService}
                                                    disabled={loading || !selectedTech}
                                                    className="bg-gray-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 border border-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <XCircle size={18} /> Bỏ qua
                                                </button>
                                                <button
                                                    onClick={handleSaveResult}
                                                    disabled={loading || !selectedTech}
                                                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <CheckCircle size={18} /> Lưu Kết Quả
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {message && (
                    <div
                        className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-5 z-50 cursor-pointer ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                        onClick={() => setMessage(null)}
                    >
                        <CheckCircle size={20} />
                        <div className="flex-1">
                            <p className="font-medium">{message.text}</p>
                            <p className="text-xs opacity-80 mt-1">Bấm để đóng</p>
                        </div>
                        <XCircle size={18} className="opacity-50 hover:opacity-100" />
                    </div>
                )}
            </div>
        </div>
    );
}
