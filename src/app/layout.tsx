import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
    title: "ClinicFlow - Quản lý Phòng Khám",
    description: "Hệ thống quản lý luồng bệnh nhân chuyên nghiệp",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi" suppressHydrationWarning>
            <body suppressHydrationWarning>
                {children}
                <Toaster position="top-right" richColors />
            </body>
        </html>
    );
}
