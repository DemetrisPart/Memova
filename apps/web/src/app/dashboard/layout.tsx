import { DashboardBearerShell } from "@/components/auth/dashboard-bearer-shell";
import { MobileNetworkBootstrap } from "@/components/guest/mobile-network-bootstrap";
import { getAuthUserOrNull } from "@/lib/api/server-fetch";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const user = await getAuthUserOrNull();

  // Normal browsers: HttpOnly cookies work → SSR dashboard.
  // Mobile Preview iframe: cookies blocked → Bearer shell from sessionStorage.
  if (!user) {
    return <DashboardBearerShell />;
  }

  // Same LAN probe as guest pages — import only; guest layout untouched.
  return <MobileNetworkBootstrap>{children}</MobileNetworkBootstrap>;
}
