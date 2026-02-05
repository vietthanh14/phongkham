'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/types';
import { Plus, Edit2, Trash2, Save, X, Shield, User } from 'lucide-react';

export default function StaffManager() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<Staff>>({ name: '', role: 'Receptionist' });

    useEffect(() => {
        fetchStaff();
    }, []);

    async function fetchStaff() {
        setLoading(true);
        const { data } = await supabase.from('staff').select('*').order('id', { ascending: true });
        if (data) setStaffList(data);
        setLoading(false);
    }

    async function handleSave() {
        if (!formData.name || !formData.role) return alert('Vui lòng nhập tên và chức vụ');

        if (editingId) {
            // Update
            const { error } = await supabase.from('staff').update(formData).eq('id', editingId);
            if (!error) {
                setEditingId(null);
                setFormData({ name: '', role: 'Receptionist' });
                fetchStaff();
            }
        } else {
            // Create
            const { error } = await supabase.from('staff').insert([formData]);
            if (!error) {
                setFormData({ name: '', role: 'Receptionist' });
                fetchStaff();
            }
        }
    }

    async function handleDelete(id: number, isActive: boolean) {
        // Soft delete toggle
        const { error } = await supabase.from('staff').update({ is_active: !isActive }).eq('id', id);
        if (!error) fetchStaff();
    }

    function startEdit(staff: Staff) {
        setEditingId(staff.id);
        setFormData({ name: staff.name, role: staff.role });
    }

    function cancelEdit() {
        setEditingId(null);
        setFormData({ name: '', role: 'Receptionist' });
    }

    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield size={20} className="text-primary" /> Quản lý Nhân sự
            </h3>

            {/* Form */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6 flex gap-4 items-end border">
                <div className="flex-1">
                    <label className="block text-xs font-medium mb-1 text-gray-500">Họ tên nhân viên</label>
                    <input
                        type="text"
                        className="w-full border p-2 rounded text-sm"
                        placeholder="VD: Nguyễn Văn A"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div className="w-48">
                    <label className="block text-xs font-medium mb-1 text-gray-500">Chức vụ</label>
                    <select
                        className="w-full border p-2 rounded text-sm"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    >
                        <option value="Receptionist">Lễ tân</option>
                        <option value="Doctor">Bác sĩ</option>
                        <option value="Technician">Kỹ thuật viên</option>
                    </select>
                </div>
                <button
                    onClick={handleSave}
                    className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600 transition-colors text-sm"
                >
                    {editingId ? <Save size={16} /> : <Plus size={16} />}
                    {editingId ? 'Lưu' : 'Thêm'}
                </button>
                {editingId && (
                    <button onClick={cancelEdit} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors text-sm">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-medium">
                        <tr>
                            <th className="p-3 rounded-tl-lg">ID</th>
                            <th className="p-3">Họ tên</th>
                            <th className="p-3">Chức vụ</th>
                            <th className="p-3">Trạng thái</th>
                            <th className="p-3 rounded-tr-lg text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {staffList.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-3 text-gray-500">#{s.id}</td>
                                <td className="p-3 font-medium">{s.name}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${s.role === 'Doctor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            s.role === 'Receptionist' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                'bg-orange-50 text-orange-700 border-orange-200'
                                        }`}>
                                        {s.role === 'Doctor' ? 'Bác sĩ' : s.role === 'Receptionist' ? 'Lễ tân' : 'KTV'}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <span className={`text-xs flex items-center gap-1 ${s.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                                        <span className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                        {s.is_active ? 'Hoạt động' : 'Đã ẩn'}
                                    </span>
                                </td>
                                <td className="p-3 text-right flex justify-end gap-2">
                                    <button onClick={() => startEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Sửa">
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(s.id, s.is_active)}
                                        className={`p-1.5 rounded transition-colors ${s.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                                        title={s.is_active ? 'Ẩn nhân viên' : 'Kích hoạt lại'}
                                    >
                                        {s.is_active ? <Trash2 size={16} /> : <Save size={16} />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
