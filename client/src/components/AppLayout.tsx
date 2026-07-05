import Sidebar from "./Sidebar";

export type NavItem = "pos" | "kitchen" | "billing" | "admin";

interface AppLayoutProps {
  active: NavItem;
  restaurantName?: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}

export default function AppLayout({
  active,
  restaurantName,
  isAdmin,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden bg-surface">
      <Sidebar active={active} restaurantName={restaurantName} isAdmin={isAdmin} />
      <main className="relative flex h-full flex-1 flex-col md:ml-64">{children}</main>
    </div>
  );
}
