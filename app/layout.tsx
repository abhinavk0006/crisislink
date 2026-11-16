import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CrisisLink Emergency Response",
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
