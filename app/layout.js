import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: 'IECBP Evaluation System | txrV.ed',
    template: '%s | IECBP Evaluation System | txrV.ed',
  },
  description: 'Scenario-Based Engineering Capability Evaluation Platform powered by txrV.ed.',
  applicationName: 'IECBP Evaluation System',
  openGraph: {
    title: 'IECBP Evaluation System | txrV.ed',
    description: 'Scenario-Based Engineering Capability Evaluation Platform powered by txrV.ed.',
    images: [{ url: '/logo.jpeg', width: 1200, height: 630, alt: 'IECBP Evaluation System Logo' }],
  },
  twitter: {
    title: 'IECBP Evaluation System | txrV.ed',
    description: 'Scenario-Based Engineering Capability Evaluation Platform powered by txrV.ed.',
    images: [{ url: '/logo.jpeg', alt: 'IECBP Evaluation System Logo' }],
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
        <head>
          <link rel="icon" href="/logo.jpeg" />
          <link rel="icon" type="image/png" href="/favicon.png" />
          <link rel="icon" type="image/jpeg" href="/logo.jpeg" />
          <link rel="icon" type="image/svg+xml" href="/favicon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
          <link rel="apple-touch-icon" href="/logo.jpeg" />
          <link rel="shortcut icon" href="/favicon.png" />
        </head>
        <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
