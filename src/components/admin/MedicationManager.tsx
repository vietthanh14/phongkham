import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Save, X, Trash2, Pill, CheckCircle, AlertCircle } from 'lucide-react';

interface MedicationItem {
    id: number;
    name: string;
    unit: string;
    is_active: boolean;
}

export default function MedicationManager() {
    const [medications, setMedications] = useState<MedicationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', unit: '' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<{ name: string, unit: string }>({ name: '', unit: '' });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchMedications();
    }, []);

    async function fetchMedications() {
        setLoading(true);
        const { data, error } = await supabase
            .from('medications')
            .select('id, name, unit, is_active')
            .order('name', { ascending: true });

        if (data) {
            setMedications(data);
        } else if (error) {
            console.error('Error fetching meds:', error);
            setMessage({ type: 'error', text: 'Lỗi tải danh sách thuốc: ' + (error.message || 'Không rõ') });
        }
        setLoading(false);
    }

    async function handleAdd() {
        if (!newItem.name || !newItem.unit) return;
        setLoading(true);
        // Default price=0, stock=0, is_active=true
        const { error } = await supabase.from('medications').insert([{
            name: newItem.name,
            unit: newItem.unit,
            is_active: true
        }]);

        if (!error) {
            setNewItem({ name: '', unit: '' });
            fetchMedications();
            setMessage({ type: 'success', text: 'Thêm thuốc thành công' });
        } else {
            setMessage({ type: 'error', text: 'Lỗi: ' + error.message });
        }
        setLoading(false);
    }

    async function handleSave(id: number) {
        setLoading(true);
        const { error } = await supabase
            .from('medications')
            .update({
                name: editForm.name,
                unit: editForm.unit
            })
            .eq('id', id);

        if (!error) {
            setEditingId(null);
            fetchMedications();
            setMessage({ type: 'success', text: 'Cập nhật thành công' });
        } else {
            setMessage({ type: 'error', text: 'Lỗi cập nhật: ' + error.message });
        }
        setLoading(false);
    }

    async function handleToggle(id: number, currentStatus: boolean) {
        const { error } = await supabase
            .from('medications')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (!error) fetchMedications();
    }

    async function handleDelete(id: number) {
        if (!confirm('Bạn có chắc muốn xóa thuốc này?')) return;
        const { error } = await supabase.from('medications').delete().eq('id', id);
        if (!error) {
            fetchMedications();
            setMessage({ type: 'success', text: 'Đã xóa thuốc' });
        } else {
            setMessage({ type: 'error', text: 'Lỗi xóa: ' + error.message });
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Pill size={20} className="text-primary" /> Danh sách Thuốc (Đơn giản)
            </h3>

            {/* Add New */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6 flex gap-3 items-end border">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tên thuốc</label>
                    <input
                        className="w-full border p-2 rounded text-sm"
                        placeholder="Ví dụ: Paracetamol 500mg..."
                        value={newItem.name}
                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    />
                </div>
                <div className="w-32">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Đơn vị</label>
                    <input
                        className="w-full border p-2 rounded text-sm"
                        placeholder="Viên, Vỉ..."
                        value={newItem.unit}
                        onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                    />
                </div>
                <button
                    onClick={handleAdd}
                    disabled={loading || !newItem.name || !newItem.unit}
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 text-sm h-[38px]"
                >
                    <Plus size={16} /> Thêm
                </button>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            <div className="overflow-hidden border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-medium">
                        <tr>
                            <th className="p-3">Tên thuốc</th>
                            <th className="p-3 w-32">Đơn vị</th>
                            <th className="p-3 text-center w-32">Trạng thái</th>
                            <th className="p-3 text-right w-24">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {medications.length === 0 && !loading && (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-400">Danh sách trống.</td></tr>
                        )}
                        {medications.map(m => (
                            <tr key={m.id} className="hover:bg-gray-50">
                                <td className="p-3">
                                    {editingId === m.id ? (
                                        <input
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="border p-1 rounded w-full"
                                        />
                                    ) : (
                                        <div className="font-medium">
                                            {m.name}
                                            {!m.is_active && <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-1 rounded">Đã ẩn</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3">
                                    {editingId === m.id ? (
                                        <input
                                            value={editForm.unit}
                                            onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                                            className="border p-1 rounded w-full"
                                        />
                                    ) : (
                                        <span className="text-gray-500">{m.unit}</span>
                                    )}
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => handleToggle(m.id, m.is_active)}
                                        className={`px-2 py-0.5 rounded text-xs border ${m.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                                    >
                                        {m.is_active ? 'Hiện' : 'Ẩn'}
                                    </button>
                                </td>
                                <td className="p-3 text-right">
                                    {editingId === m.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleSave(m.id)} className="text-green-600 p-1 hover:bg-green-50 rounded"><Save size={16} /></button>
                                            <button onClick={() => setEditingId(null)} className="text-gray-500 p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingId(m.id);
                                                    setEditForm({ name: m.name, unit: m.unit });
                                                }}
                                                className="text-blue-600 p-1 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(m.id)}
                                                className="text-red-600 p-1 hover:bg-red-50 rounded"
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
        </div>
    );
}
