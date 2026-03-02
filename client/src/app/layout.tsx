import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '온라인 멀티 지뢰찾기',
  description: '실시간 멀티플레이어 지뢰찾기 게임',
  appleWebApp: {
    capable: true,
    title: '온라인 멀티 지뢰찾기',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: '#1a1a2e' }}>{children}</body>
    </html>
  )
}
