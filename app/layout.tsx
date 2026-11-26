import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Course management",
  description: "A learning hub for courses, materials, and assignments.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
