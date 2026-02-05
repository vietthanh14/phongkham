'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Visit, VisitStatus } from '@/types';
import { Clock, User, ArrowRight, Trash2, RefreshCw, Star } from 'lucide-react';

interface QueueListProps {
    status: VisitStatus | 'Missed' | 'Cancelled';
    title: string;
    refreshInterval?: number;
    onSelect?: (visit: Visit) => void;
    onCancel?: (visit: Visit) => void;
    onRestore?: (visit: Visit) => void;
    onPrioritize?: (visit: Visit) => void; // New prop for reordering
    filterServiceType?: string;
    filterDoctor?: string; // New prop
    className?: string; // Allow style overrides
}

export default function QueueList({ status, title, refreshInterval = 5000, onSelect, onCancel, onRestore, onPrioritize, filterServiceType, filterDoctor, className = '' }: QueueListProps) {
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
            console.error('Error fetching queue:', JSON.stringify(error, null, 2));
        }

        if (data) setQueue(data);
        setLoading(false);
    }

    // Filter queue based on selected service type
    const filteredQueue = filterServiceType && filterServiceType !== 'Tất cả'
        ? queue.filter(visit => visit.services?.some(s => s.service_type === filterServiceType && s.status === 'Pending'))
        : queue;

    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-md ${className}`}>
            <div className="bg-slate-50/80 backdrop-blur-sm px-4 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                <h3 className="font-bold flex items-center gap-2 text-slate-800 tracking-tight">
                    <Clock size={18} className="text-blue-600" strokeWidth={2.5} /> {title}
                </h3>
                <span className="bg-blue-600 text-white text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold shadow-sm shadow-blue-200">
                    {filteredQueue.length} Bệnh nhân
                </span>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {loading && queue.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-400 font-medium">Đang tải...</p>
                    </div>
                ) : filteredQueue.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-2">
                        <User size={32} className="text-slate-200" strokeWidth={1.5} />
                        <p className="text-sm text-slate-400 italic font-medium">Danh sách trống</p>
                    </div>
                ) : (
                    filteredQueue.map((item, index) => (
                        <div
                            key={item.id}
                            className={`p-4 hover:bg-blue-50/50 transition-all duration-200 flex flex-col gap-2 group relative border-l-4 border-transparent hover:border-blue-500 overflow-hidden ${onSelect ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4" onClick={() => onSelect?.(item)}>
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                        {index + 1}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="font-bold text-slate-800 flex items-center gap-2 text-base group-hover:text-blue-700 transition-colors">
                                            {item.patient?.full_name}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                ID: {item.patient?.cccd}
                                            </span>
                                            <span className="text-[11px] text-slate-400 flex items-center gap-1" suppressHydrationWarning>
                                                <Clock size={12} strokeWidth={2} />
                                                {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">

                                    {onRestore && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRestore(item); }}
                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all active:scale-90 z-20"
                                            title="Khôi phục"
                                        >
                                            <RefreshCw size={18} strokeWidth={2.5} />
                                        </button>
                                    )}
                                    {onCancel && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onCancel(item); }}
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-90 z-20"
                                            title="Hủy / Xóa"
                                        >
                                            <Trash2 size={18} strokeWidth={2.5} />
                                        </button>
                                    )}
                                    {onSelect && (
                                        <div className="p-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" onClick={() => onSelect?.(item)}>
                                            <ArrowRight size={20} className="text-blue-600" strokeWidth={2.5} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Service Badges */}
                            {item.services && item.services.length > 0 && (
                                <div className="ml-14 flex flex-wrap gap-1.5 mt-1">
                                    {item.services.filter(s => s.status === 'Pending').map(service => (
                                        <span key={service.id} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200 font-bold uppercase tracking-tight shadow-sm">
                                            {service.service_type}
                                        </span>
                                    ))}
                                    {item.services.filter(s => s.status === 'Completed').length > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 font-bold uppercase tracking-tight shadow-sm">
                                            +{item.services.filter(s => s.status === 'Completed').length} Xong
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
