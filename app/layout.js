import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export const metadata = {
  title: "Get in touch",
  description: "Share your details and our team will contact you shortly.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b3d32",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={manrope.className}>
      <body>{children}</body>
    </html>
  );
}