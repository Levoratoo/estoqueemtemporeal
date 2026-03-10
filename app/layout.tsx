import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

export const metadata = {
  title: "Dashboard GRID",
  description: "Dashboard operacional de pedidos pendentes"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${sora.className} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
