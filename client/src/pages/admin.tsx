import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin-layout";
import AdminLogin from "@/components/admin-login";
import ImportsSection from "@/components/admin/imports-section";
import StatisticsSection from "@/components/admin/statistics-section";
import ContentSection from "@/components/admin/content-section";
import HistorySection from "@/components/admin/history-section";
import CouponsSection from "@/components/admin/coupons-section";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentSection, setCurrentSection] = useState("imports");

  useEffect(() => {
    // Check if user is authenticated
    const authenticated = sessionStorage.getItem("adminAuthenticated") === "true";
    setIsAuthenticated(authenticated);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated");
    sessionStorage.removeItem("adminEmail");
    setIsAuthenticated(false);
  };

  const renderSection = () => {
    switch (currentSection) {
      case "imports":
        return <ImportsSection />;
      case "statistics":
        return <StatisticsSection />;
      case "content":
        return <ContentSection />;
      case "history":
        return <HistorySection />;
      case "coupons":
        return <CouponsSection />;
      default:
        return <ImportsSection />;
    }
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <AdminLayout 
      currentSection={currentSection} 
      onSectionChange={setCurrentSection}
      onLogout={handleLogout}
    >
      {renderSection()}
    </AdminLayout>
  );
}