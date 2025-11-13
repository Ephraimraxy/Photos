import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Browse from "@/pages/browse";
import Admin from "@/pages/admin";
import Checkout from "@/pages/checkout";
import Purchase from "@/pages/purchase";
import Tracking from "@/pages/tracking";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Browse} />
      <Route path="/admin" component={Admin} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/purchase/:id" component={Purchase} />
      <Route path="/tracking" component={Tracking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Enhanced screenshot detection and prevention
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Print Screen and common screenshot shortcuts
      if (e.key === "PrintScreen" || 
          (e.ctrlKey && e.shiftKey && e.key === "S") ||
          (e.ctrlKey && e.key === "S") ||
          (e.metaKey && e.shiftKey && e.key === "4") ||
          (e.metaKey && e.shiftKey && e.key === "3")) {
        e.preventDefault();
        console.warn("Screenshots and downloads are disabled");
        alert("Screenshots and downloads are disabled for security");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.warn("Screenshot attempt detected");
        // Blur all images when tab becomes hidden
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          img.style.filter = 'blur(10px)';
        });
      } else {
        // Restore images when tab becomes visible
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          img.style.filter = 'none';
        });
      }
    };

    // Enhanced right-click protection
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target instanceof Element && (
          target.closest("[data-testid^='watermark-']") || 
          target.tagName === "IMG" || 
          target.closest('.content-card') ||
          target.closest('.preview-container'))) {
        e.preventDefault();
        alert("Right-click is disabled for security");
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target && target instanceof Element && (target.tagName === "IMG" || target.closest('.content-card'))) {
        e.preventDefault();
      }
    };

    // Prevent text selection on images
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target instanceof Element && (target.tagName === "IMG" || target.closest('.content-card'))) {
        e.preventDefault();
      }
    };

    // Disable F12, Ctrl+Shift+I, Ctrl+U
    const handleDevTools = (e: KeyboardEvent) => {
      if (e.key === "F12" || 
          (e.ctrlKey && e.shiftKey && e.key === "I") ||
          (e.ctrlKey && e.key === "U")) {
        e.preventDefault();
        alert("Developer tools are disabled for security");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleDevTools);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("selectstart", handleSelectStart);

    // Add CSS to prevent image saving
    const style = document.createElement('style');
    style.textContent = `
      img {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
        user-drag: none;
        pointer-events: none;
      }
      .content-card img {
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleDevTools);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("selectstart", handleSelectStart);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
