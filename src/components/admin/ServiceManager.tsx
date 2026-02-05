import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Save, X, Trash2, Tag, CheckCircle, AlertCircle } from 'lucide-react';

interface ServiceItem {
    id: number;
    name: string;
    price: number;
    is_active: boolean;
}

export default function ServiceManager() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', price: '' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<{ price: string, name: string }>({ price: '', name: '' });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchServices();
    }, []);

    async function fetchServices() {
        setLoading(true);
        const { data, error } = await supabase
            .from('service_catalog')
            .select('*')
            .order('id', { ascending: true });

        if (data) {
            setServices(data);
        } else if (error) {
            console.error(error);
            // Friendly error if table doesn't exist
            if (error.code === '42P01') {
                setMessage({
                    type: 'error',
                    text: 'Bảng dữ liệu "service_catalog" chưa được tạo. Vui lòng chạy SQL trong db/schema.sql'
                });
            }
        }
        setLoading(false);
    }

    async function handleAdd() {
        if (!newItem.name || !newItem.price) return;
        setLoading(true);
        const { error } = await supabase.from('service_catalog').insert([{
            name: newItem.name,
            price: Number(newItem.price),
            is_active: true
        }]);

        if (!error) {
            setNewItem({ name: '', price: '' });
            fetchServices();
            setMessage({ type: 'success', text: 'Thêm dịch vụ thành công' });
        } else {
            setMessage({ type: 'error', text: 'Lỗi: ' + error.message });
        }
        setLoading(false);
    }

    async function handleSave(id: number) {
        setLoading(true);
        const { error } = await supabase
            .from('service_catalog')
            .update({
                name: editForm.name,
                price: Number(editForm.price)
            })
            .eq('id', id);

        if (!error) {
            setEditingId(null);
            fetchServices();
            setMessage({ type: 'success', text: 'Cập nhật thành công' });
        } else {
            setMessage({ type: 'error', text: 'Lỗi cập nhật: ' + error.message });
        }
        setLoading(false);
    }

    async function handleToggle(id: number, currentStatus: boolean) {
        const { error } = await supabase
            .from('service_catalog')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (!error) fetchServices();
    }

    async function handleDelete(id: number) {
        if (!confirm('Bạn có chắc muốn xóa dịch vụ này?')) return;
        const { error } = await supabase.from('service_catalog').delete().eq('id', id);
        if (!error) {
            fetchServices();
            setMessage({ type: 'success', text: 'Đã xóa dịch vụ' });
        } else {
            setMessage({ type: 'error', text: 'Lỗi xóa: ' + error.message });
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Tag size={20} className="text-primary" /> Quản lý Dịch vụ & Bảng giá
            </h3>

            {/* Add New */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6 flex gap-3 items-end border">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tên dịch vụ</label>
                    <input
                        className="w-full border p-2 rounded text-sm"
                        placeholder="Ví dụ: Siêu âm bụng, X-Quang..."
                        value={newItem.name}
                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    />
                </div>
                <div className="w-40">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Đơn giá (VNĐ)</label>
                    <input
                        type="number"
                        className="w-full border p-2 rounded text-sm"
                        placeholder="0"
                        value={newItem.price}
                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                    />
                </div>
                <button
                    onClick={handleAdd}
                    disabled={loading || !newItem.name || !newItem.price}
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
                            <th className="p-3">Tên dịch vụ</th>
                            <th className="p-3 text-right">Đơn giá</th>
                            <th className="p-3 text-center">Trạng thái</th>
                            <th className="p-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {services.length === 0 && !loading && (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-400">Chưa có dịch vụ nào.</td></tr>
                        )}
                        {services.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-3">
                                    {editingId === s.id ? (
                                        <input
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="border p-1 rounded w-full"
                                        />
                                    ) : (
                                        <span className={!s.is_active ? 'text-gray-400 line-through' : ''}>{s.name}</span>
                                    )}
                                </td>
                                <td className="p-3 text-right font-mono">
                                    {editingId === s.id ? (
                                        <input
                                            type="number"
                                            value={editForm.price}
                                            onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                            className="border p-1 rounded w-32 text-right"
                                        />
                                    ) : (
                                        s.price.toLocaleString('vi-VN') + ' ₫'
                                    )}
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => handleToggle(s.id, s.is_active)}
                                        className={`px-2 py-0.5 rounded text-xs border ${s.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                                    >
                                        {s.is_active ? 'Đang dùng' : 'Đã ẩn'}
                                    </button>
                                </td>
                                <td className="p-3 text-right">
                                    {editingId === s.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleSave(s.id)} className="text-green-600 p-1 hover:bg-green-50 rounded"><Save size={16} /></button>
                                            <button onClick={() => setEditingId(null)} className="text-gray-500 p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setEditingId(s.id); setEditForm({ name: s.name, price: s.price.toString() }); }}
                                                className="text-blue-600 p-1 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
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
