'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Visit, VisitStatus } from '@/types';
import { Clock, User, ArrowRight, Trash2, RefreshCw } from 'lucide-react';

interface QueueListProps {
    status: VisitStatus | 'Missed' | 'Cancelled';
    title: string;
    refreshInterval?: number;
    onSelect?: (visit: Visit) => void;
    onCancel?: (visit: Visit) => void;
    onRestore?: (visit: Visit) => void;
    filterServiceType?: string;
    filterDoctor?: string; // New prop
}

export default function QueueList({ status, title, refreshInterval = 5000, onSelect, onCancel, onRestore, filterServiceType, filterDoctor }: QueueListProps) {
    const [queue, setQueue] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, refreshInterval);
        return () => clearInterval(interval);
    }, [status, filterDoctor]); // Re-fetch if doctor changes

    async function fetchQueue() {
        let query = supabase
            .from('visits')
            .select(`
        *,
        patient:patients(*),
        services(*)
      `)
            .eq('status', status)
            .order('created_at', { ascending: true });

        if (filterDoctor) {
            query = query.eq('doctor_by', filterDoctor);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching queue:', error);
        }

        if (data) setQueue(data);
        setLoading(false);
    }

    // Filter queue based on selected service type
    const filteredQueue = filterServiceType && filterServiceType !== 'Tất cả'
        ? queue.filter(visit => visit.services?.some(s => s.service_type === filterServiceType && s.status === 'Pending'))
        : queue;

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2 text-gray-700">
                    <Clock size={18} className="text-primary" /> {title}
                </h3>
                <span className="bg-primary text-white text-xs px-2 py-1 rounded-full font-bold">
                    {filteredQueue.length} người
                </span>
            </div>

            <div className="divide-y max-h-[400px] overflow-y-auto">
                {loading && queue.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">Đang tải...</div>
                ) : filteredQueue.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic">Trống</div>
                ) : (
                    filteredQueue.map((item, index) => (
                        <div
                            key={item.id}
                            className={`p-4 hover:bg-blue-50 transition-colors flex flex-col gap-2 group ${onSelect ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3" onClick={() => onSelect?.(item)}>
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-primary flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            {item.patient?.full_name}
                                            <span className="text-xs text-gray-400 font-normal">CCCD: {item.patient?.cccd}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5" suppressHydrationWarning>
                                            Vào: {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onRestore && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRestore(item); }}
                                            className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors z-10"
                                            title="Khôi phục"
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                    )}
                                    {onCancel && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onCancel(item); }}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors z-10"
                                            title="Hủy / Xóa khỏi hàng đợi"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onSelect?.(item)}>
                                        <ArrowRight size={18} className="text-gray-300" />
                                    </div>
                                </div>
                            </div>

                            {/* Service Badges */}
                            {item.services && item.services.length > 0 && (
                                <div className="ml-11 flex flex-wrap gap-1">
                                    {item.services.filter(s => s.status === 'Pending').map(service => (
                                        <span key={service.id} className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200 font-medium">
                                            {service.service_type}
                                        </span>
                                    ))}
                                    {item.services.filter(s => s.status === 'Completed').length > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-800 rounded-full border border-green-200 font-medium">
                                            +{item.services.filter(s => s.status === 'Completed').length} xong
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div >
    );
}
