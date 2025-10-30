import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  BarChart3, 
  Image, 
  History, 
  Gift, 
  ArrowLeft,
  Menu,
  X
} from "lucide-react";
import { useLocation } from "wouter";

interface AdminLayoutProps {
  children: React.ReactNode;
  currentSection: string;
  onSectionChange: (section: string) => void;
}

const navigationItems = [
  { id: "imports", label: "Imports", icon: Upload },
  { id: "statistics", label: "Statistics", icon: BarChart3 },
  { id: "content", label: "Content", icon: Image },
  { id: "history", label: "History", icon: History },
  { id: "coupons", label: "Coupons", icon: Gift },
];

export default function AdminLayout({ children, currentSection, onSectionChange }: AdminLayoutProps) {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold font-display">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Fixed Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static top-16 left-0 z-20 w-64 h-[calc(100vh-4rem)] bg-background border-r border-border transition-transform duration-300 ease-in-out lg:transition-none overflow-y-auto`}>
          <div className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentSection === item.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    onSectionChange(item.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </aside>

        {/* Scrollable Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
