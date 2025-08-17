// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Kalp Toplama Oyunu",
  description: "Tatlış mini oyun 💖",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
