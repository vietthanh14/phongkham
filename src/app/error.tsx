'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Đã xảy ra lỗi!</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border max-w-md w-full mb-6">
                <p className="text-gray-600 mb-2">Chi tiết lỗi:</p>
                <code className="block bg-gray-100 p-2 rounded text-sm overflow-x-auto text-red-500 mb-4">
                    {error.message || 'Lỗi không xác định'}
                </code>
            </div>
            <button
                onClick={() => reset()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
            >
                Thử lại
            </button>
        </div>
    );
}
