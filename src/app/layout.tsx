import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/features/cart/cart-context";
import { Header } from "@/components/navigation/header";
import { Footer } from "@/components/navigation/footer";
import { CartDrawer } from "@/components/navigation/cart-drawer";

export const metadata: Metadata = {
  title: "Smash & Sizzle | Premium Fast-Food & Craft Burgers",
  description:
    "Experience chef-crafted smashed Angus burgers, crispy buttermilk chicken, loaded hand-cut fries, and artisanal custard shakes. Fast delivery and express pickup.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[var(--ink)] text-[var(--cream)] antialiased flex flex-col font-sans selection:bg-[var(--accent-red)] selection:text-white">
        {/* Skip to Main Content Link for WCAG 2.2 Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent-red)] focus:text-white focus:rounded-full focus:font-semibold focus:shadow-xl"
        >
          Skip to main content
        </a>

        <CartProvider>
          <Header />
          <main id="main-content" className="flex-1 focus:outline-none">
            {children}
          </main>
          <CartDrawer />
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
