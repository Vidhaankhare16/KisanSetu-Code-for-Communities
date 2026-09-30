import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { I18nProvider } from "@/i18n/client";
import { getLang, getMessages } from "@/i18n/server";
import { createTranslator } from "@/i18n/translate";
import { FieldProvider } from "@/lib/fieldStore";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KisanSetu — plan your crop with the whole season in view", template: "%s · KisanSetu" },
  description:
    "Open agro-advisory for Indian farmers: simulate every crop on your field with satellite weather, soil and forecast data, get regenerative advice in 11 languages, and diagnose crop disease from a photo.",
  applicationName: "KisanSetu",
};

export const viewport: Viewport = {
  themeColor: "#f2f5f0",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  const messages = await getMessages(lang);
  const t = createTranslator(messages);

  return (
    <html lang={lang} className={fontVariables}>
      <body className="flex min-h-dvh flex-col antialiased">
        <I18nProvider lang={lang} messages={messages}>
          <FieldProvider>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">
              Skip to content
            </a>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter t={t} />
          </FieldProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
