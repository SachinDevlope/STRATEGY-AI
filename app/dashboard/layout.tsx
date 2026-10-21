import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Shared shell, so loading screens don't wait on the navbar's session lookup.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
