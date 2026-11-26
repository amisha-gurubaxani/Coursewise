import { Navigation } from "@/components/navigation";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><Navigation /><main className="shell">{children}</main></>;
}
