'use client';

import Link from 'next/link';
import { UserPlus, Stethoscope, Beaker, Users } from 'lucide-react';

export default function Home() {
    return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
            <div className="z-10 w-full max-w-4xl flex flex-col items-center text-center">
                <h1 className="text-5xl font-bold text-primary mb-4 tracking-tight">ClinicFlow</h1>
                <p className="text-xl text-gray-600 mb-12 max-w-2xl">
                    Hệ thống quản lý phòng khám hiện đại, tối ưu hóa luồng bệnh nhân từ tiếp đón đến kết luận.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    <Link href="/reception" className="group">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-xl hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                                <UserPlus size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-primary">Lễ tân</h2>
                            <p className="text-gray-500 text-sm">
                                Đăng ký bệnh nhân mới, cấp số thứ tự và thu tiền.
                            </p>
                        </div>
                    </Link>

                    <Link href="/doctor" className="group">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-xl hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 group-hover:scale-110 transition-transform">
                                <Stethoscope size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-green-600">Bác sĩ</h2>
                            <p className="text-gray-500 text-sm">
                                Khám bệnh, chỉ định cận lâm sàng và kê đơn thuốc.
                            </p>
                        </div>
                    </Link>

                    <Link href="/technician" className="group">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-xl hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center">
                            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform">
                                <Beaker size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-purple-600">Kỹ thuật viên</h2>
                            <p className="text-gray-500 text-sm">
                                Thực hiện X-Quang, Siêu âm và trả kết quả hình ảnh.
                            </p>
                        </div>
                    </Link>

                    <Link href="/admin" className="group">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-xl hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">Quản trị</div>
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-600 group-hover:scale-110 transition-transform">
                                <Users size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-gray-600">Admin</h2>
                            <p className="text-gray-500 text-sm">
                                Quản lý nhân sự, danh sách bệnh nhân và cài đặt hệ thống.
                            </p>
                        </div>
                    </Link>
                </div>

                <div className="mt-16 text-gray-400 text-sm flex items-center gap-2">
                    <Users size={16} />
                    <span>Hệ thống đang hoạt động trên nền tảng Cloud + Google Drive EDU</span>
                </div>
            </div>
        </main>
    );
}
