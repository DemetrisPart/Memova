import type { Metadata } from "next";
import { Great_Vibes } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "../styles/designs.css";
import "../styles/designs-alt.css";
import "../styles/designs-real.css";

/** Fallback script until ED Lavonia woff2 is added to public/fonts/ */
const coupleFallback = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-couple-fallback",
});

export const metadata: Metadata = {
  title: "Momeva",
  description: "Premium event memory platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-guest-theme="original" suppressHydrationWarning>
      <body
        className={`${coupleFallback.variable} text-charcoal-900 antialiased`}
      >
        <Script
          id="guest-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("momeva_guest_theme");var m={atelier:"garden",lumiere:"stories",arc:"ticket",frame:"stories",postcard:"garden",mono:"wallet",cinematic:"stories","cinematic-noir":"wallet","cinematic-red":"ticket","cinematic-analog":"garden"};if(t&&m[t])t=m[t];if(t)document.documentElement.dataset.guestTheme=t}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
