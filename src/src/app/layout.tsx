import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'סידור עבודה – משמר אילת',
  description: 'מערכת לניהול סידור עבודה',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-heebo bg-bg text-text min-h-screen">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#222638',
              color: '#e8eaf6',
              border: '1px solid #2e3350',
              fontFamily: 'Heebo, sans-serif',
              direction: 'rtl',
            },
          }}
        />
      </body>
    </html>
  )
}
