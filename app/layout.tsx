import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WebsiteSchema, OrganizationSchema } from "@/components/seo-schema";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gongmyung's App Gallery - 독창적인 앱 컬렉션",
  description: "Gongmyung이 직접 제작하고 큐레이션한 독창적인 앱들의 갤러리입니다. 창의성과 목적을 조화롭게 담은 다양한 앱들을 만나보세요.",
  keywords: "앱 갤러리, 모바일 앱, 앱 개발, Gongmyung, 앱 컬렉션, 독창적인 앱, 앱 스토리",
  authors: [{ name: "Gongmyung" }],
  creator: "Gongmyung",
  publisher: "Gongmyung",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://gongmyung.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Gongmyung's App Gallery - 독창적인 앱 컬렉션",
    description: "Gongmyung이 직접 제작하고 큐레이션한 독창적인 앱들의 갤러리입니다. 창의성과 목적을 조화롭게 담은 다양한 앱들을 만나보세요.",
    url: 'https://gongmyung.vercel.app',
    siteName: "Gongmyung's App Gallery",
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: "Gongmyung's App Gallery",
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Gongmyung's App Gallery - 독창적인 앱 컬렉션",
    description: "Gongmyung이 직접 제작하고 큐레이션한 독창적인 앱들의 갤러리입니다.",
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Google Search Console에서 받은 코드로 교체
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Gongmyung's App Gallery",
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <WebsiteSchema />
        <OrganizationSchema />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
