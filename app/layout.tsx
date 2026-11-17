import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Crisis Link Emergency Resource Coordination & Response Management System",
  description:
    "Fictional DBMS mini project by Sachin R and Abhinav Krishna Kandukuri",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
