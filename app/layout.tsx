import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Budget vs Actuals · Canvas Labs",
  description: "Pigment case study prototype: budget vs actuals and miscoding correction workflow.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full min-w-[1280px]">
        <TooltipProvider delayDuration={200}>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-w-0">{children}</SidebarInset>
          </SidebarProvider>
          <Toaster theme="light" position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
