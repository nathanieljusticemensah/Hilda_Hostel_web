import "./globals.css"
import type { Metadata, Viewport } from "next"
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister"

export const metadata: Metadata = {
  title: "Hilda Hostel Portal",
  description: "Live utility status, maintenance tickets, and room booking for Hilda Hostel.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hilda Hostel",
  },
}

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}