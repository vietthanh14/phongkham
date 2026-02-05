import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Visit } from '@/types';
import { X, DollarSign, CheckCircle, Pill, Stethoscope, Banknote } from 'lucide-react';

interface PaymentModalProps {
    visit: Visit;
    onClose: () => void;
    onConfirm: () => void;
}

export default function PaymentModal({ visit, onClose, onConfirm }: PaymentModalProps) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<{ name: string, qty: number, price: number, type: 'service' | 'medication' }[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchDetails();
    }, [visit]);

    async function fetchDetails() {
        setLoading(true);
        const billItems: any[] = [];
        let totalAmount = 0;

        // Fetch Service Config (Prices)
        const { data: serviceCatalog } = await supabase
            .from('service_catalog')
            .select('name, price')
            .eq('is_active', true);

        const servicePriceMap = new Map((serviceCatalog || []).map(s => [s.name, Number(s.price)]));

        // Helper to get price (default to 0 if not custom set, except for Exam which defaults to 50k if missing)
        const getServicePrice = (name: string) => {
            if (servicePriceMap.has(name)) return servicePriceMap.get(name) || 0;
            if (name === 'Khám bệnh' || name === 'General Exam') return 50000; // Fallback default
            return 0;
        }

        // 1. Add Consult Fee (Standard)
        const examPrice = getServicePrice('Khám bệnh');
        billItems.push({ name: 'Khám bệnh', qty: 1, price: examPrice, type: 'service' });
        totalAmount += examPrice;

        // 2. Fetch Services
        const { data: services } = await supabase
            .from('services')
            .select('service_type')
            .eq('visit_id', visit.id)
            .neq('status', 'Skipped'); // Don't charge for skipped

        if (services) {
            services.forEach(s => {
                const price = getServicePrice(s.service_type);
                billItems.push({ name: s.service_type, qty: 1, price, type: 'service' });
                totalAmount += price;
            });
        }

        // 3. Fetch Prescriptions & Calculate Meds
        // Need to join with medications table to get current price
        const { data: prescriptions } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('visit_id', visit.id);

        // This is tricky because medication_data is JSONB and we need prices from 'medications' table.
        // For accurate pricing, we should fetch all medications to map prices.
        const { data: allMeds } = await supabase.from('medications').select('name, price');
        const priceMap = new Map((allMeds || []).map(m => [m.name, Number(m.price)]));

        if (prescriptions) {
            prescriptions.forEach(p => {
                const meds = p.medication_data as any[]; // Expected array from Doctor module
                if (Array.isArray(meds)) {
                    meds.forEach(m => {
                        const unitPrice = priceMap.get(m.name) || 0;
                        const qty = parseInt(m.qty) || 0;
                        const lineTotal = unitPrice * qty;
                        billItems.push({ name: m.name, qty, price: lineTotal, type: 'medication' });
                        totalAmount += lineTotal;
                    });
                }
            });
        }

        setItems(billItems);
        setTotal(totalAmount);
        setLoading(false);
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <DollarSign className="text-green-600" /> Thanh toán Viện phí
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Đang tính toán...</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Patient Info */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-700 mb-2">Thông tin hành chính</h4>
                                <p><span className="text-gray-500">Bệnh nhân:</span> {visit.patient?.full_name}</p>
                                <p><span className="text-gray-500">Mã lượt khám:</span> {visit.id.slice(0, 8)}...</p>
                            </div>

                            {/* Bill Details */}
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Chi tiết dịch vụ & Thuốc</h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-600">
                                            <tr>
                                                <th className="p-2 text-left">Nội dung</th>
                                                <th className="p-2 text-center">SL</th>
                                                <th className="p-2 text-right">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-2 flex items-center gap-2">
                                                        {item.type === 'service' ? <Stethoscope size={14} className="text-blue-500" /> : <Pill size={14} className="text-purple-500" />}
                                                        {item.name}
                                                    </td>
                                                    <td className="p-2 text-center text-gray-500">x{item.qty}</td>
                                                    <td className="p-2 text-right font-medium">
                                                        {item.price > 0
                                                            ? item.price.toLocaleString('vi-VN') + ' ₫'
                                                            : <span className="text-xs text-gray-500 italic">Kê đơn (tự túc)</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-green-50 font-bold text-green-800">
                                            <tr>
                                                <td colSpan={2} className="p-3 text-right">TỔNG CỘNG:</td>
                                                <td className="p-3 text-right text-lg">
                                                    {total.toLocaleString('vi-VN')} ₫
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">
                        Bỏ qua
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 shadow-md flex items-center gap-2 font-medium"
                    >
                        <Banknote size={20} /> Xác nhận Đã thu tiền
                    </button>
                </div>
            </div>
        </div>
    );
}
