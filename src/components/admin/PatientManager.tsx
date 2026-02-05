'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/types';
import { Search, Edit2, Save, X, User, Trash2, History } from 'lucide-react';
import PatientHistoryModal from '@/components/PatientHistoryModal';

export default function PatientManager() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Patient>>({});
    const [viewHistoryPatient, setViewHistoryPatient] = useState<Patient | null>(null);

    useEffect(() => {
        fetchRecentPatients();
    }, []);

    async function fetchRecentPatients() {
        setLoading(true);
        const { data } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setPatients(data);
        setLoading(false);
    }

    // Debounce search could be better, but simple search on button for MVP
    async function handleSearch() {
        if (!searchTerm) {
            fetchRecentPatients();
            return;
        }
        setLoading(true);
        const { data } = await supabase
            .from('patients')
            .select('*')
            .or(`full_name.ilike.%${searchTerm}%,cccd.eq.${searchTerm}`)
            .limit(20);

        if (data) setPatients(data);
        setLoading(false);
    }

    function startEdit(patient: Patient) {
        setEditingId(patient.id);
        setEditForm({ ...patient });
    }

    async function handleSave() {
        if (!editingId) return;
        const { error } = await supabase.from('patients').update(editForm).eq('id', editingId);
        if (!error) {
            setLoading(true);
            // Refresh list (optimistic update would be better but keeping it simple)
            setPatients(patients.map(p => p.id === editingId ? { ...p, ...editForm } : p));
            setEditingId(null);
            setLoading(false);
        } else {
            alert('Lỗi khi lưu!');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Hành động này không thể hoàn tác. Bạn chắc chắn chứ?')) return;

        setLoading(true);
        // Delete active visits first (optional check, but good for safety if no cascade)
        await supabase.from('visits').delete().eq('patient_id', id);

        const { error } = await supabase.from('patients').delete().eq('id', id);

        if (!error) {
            setPatients(patients.filter(p => p.id !== id));
            alert('Đã xóa bệnh nhân thành công.');
        } else {
            alert('Lỗi khi xóa: ' + error.message);
        }
        setLoading(false);
    }

    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User size={20} className="text-primary" /> Quản lý Bệnh nhân
            </h3>

            {/* Search */}
            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    className="flex-1 border p-2 rounded-lg text-sm"
                    placeholder="Tìm theo Tên hoặc CCCD..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button
                    onClick={handleSearch}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
                >
                    <Search size={16} /> Tìm kiếm
                </button>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-medium">
                        <tr>
                            <th className="p-3 rounded-tl-lg">CCCD</th>
                            <th className="p-3">Họ tên</th>
                            <th className="p-3">Năm sinh</th>
                            <th className="p-3">SĐT</th>
                            <th className="p-3">Địa chỉ</th>
                            <th className="p-3 rounded-tr-lg text-right">Sửa</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading && <tr><td colSpan={6} className="p-4 text-center text-gray-400">Đang tải...</td></tr>}
                        {!loading && patients.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400 italic">Nhập từ khóa để tìm kiếm...</td></tr>}

                        {patients.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="p-3">
                                    {editingId === p.id ? (
                                        <input
                                            value={editForm.cccd || ''}
                                            onChange={e => setEditForm({ ...editForm, cccd: e.target.value })}
                                            className="w-full border p-1 rounded"
                                        />
                                    ) : p.cccd}
                                </td>
                                <td className="p-3 font-medium">
                                    {editingId === p.id ? (
                                        <input
                                            value={editForm.full_name || ''}
                                            onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                            className="w-full border p-1 rounded"
                                        />
                                    ) : p.full_name}
                                </td>
                                <td className="p-3">
                                    {editingId === p.id ? (
                                        <input
                                            type="date"
                                            value={editForm.dob ? new Date(editForm.dob).toISOString().split('T')[0] : ''} // basic handling
                                            onChange={e => setEditForm({ ...editForm, dob: e.target.value })}
                                            className="w-24 border p-1 rounded"
                                        />
                                    ) : (p.dob ? new Date(p.dob).getFullYear() : '-')}
                                </td>
                                <td className="p-3">
                                    {editingId === p.id ? (
                                        <input
                                            value={editForm.phone || ''}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="w-full border p-1 rounded"
                                        />
                                    ) : p.phone}
                                </td>
                                <td className="p-3 max-w-[200px] truncate" title={p.address || ''}>
                                    {editingId === p.id ? (
                                        <input
                                            value={editForm.address || ''}
                                            onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                            className="w-full border p-1 rounded"
                                        />
                                    ) : p.address}
                                </td>
                                <td className="p-3 text-right">
                                    {editingId === p.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={handleSave} className="text-green-600 hover:bg-green-50 p-1.5 rounded"><Save size={16} /></button>
                                            <button onClick={() => setEditingId(null)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1 justify-end">
                                            <button onClick={() => startEdit(p)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Sửa">
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => setViewHistoryPatient(p)}
                                                className="text-purple-600 hover:bg-purple-50 p-1.5 rounded"
                                                title="Xem bệnh sử"
                                            >
                                                <History size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`CẢNH BÁO: Xóa bệnh nhân ${p.full_name} sẽ xóa toàn bộ lịch sử khám!\nBạn có chắc chắn không?`)) {
                                                        handleDelete(p.id);
                                                    }
                                                }}
                                                className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                                                title="Xóa vĩnh viễn"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {viewHistoryPatient && (
                <PatientHistoryModal
                    patient={viewHistoryPatient}
                    onClose={() => setViewHistoryPatient(null)}
                />
            )}
        </div>
    );
}
