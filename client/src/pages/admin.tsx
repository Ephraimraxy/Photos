import { useState } from "react";
import AdminLayout from "@/components/admin-layout";
import ImportsSection from "@/components/admin/imports-section";
import StatisticsSection from "@/components/admin/statistics-section";
import ContentSection from "@/components/admin/content-section";
import HistorySection from "@/components/admin/history-section";
import CouponsSection from "@/components/admin/coupons-section";

export default function Admin() {
  const [currentSection, setCurrentSection] = useState("imports");

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

  return (
    <AdminLayout currentSection={currentSection} onSectionChange={setCurrentSection}>
      {renderSection()}
    </AdminLayout>
  );
}