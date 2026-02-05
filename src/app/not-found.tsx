import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <h2 className="text-4xl font-bold text-primary mb-4">404 - Không tìm thấy trang</h2>
            <p className="text-gray-600 mb-8">Xin lỗi, trang bạn tìm kiếm không tồn tại.</p>
            <Link href="/" className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors">
                Quay về Trang chủ
            </Link>
        </div>
    )
}
