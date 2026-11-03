import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { AppRail } from "@/components/shell/app-rail"
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
      <body className="flex min-h-full min-w-[1280px]">
        <TooltipProvider delayDuration={200}>
          <AppRail />
          <main className="min-w-0 flex-1 px-8 pt-6 pb-12">{children}</main>
          <Toaster theme="light" position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
