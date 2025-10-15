import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { CartSidebar } from "@/components/cart-sidebar";
import { ContentCard } from "@/components/content-card";
import { ShoppingCart, Image as ImageIcon, Video } from "lucide-react";
import { type Content, type CartItem } from "@shared/schema";
import { useLocation } from "wouter";

export default function Browse() {
  const [, setLocation] = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // Load cart from localStorage on mount
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<"images" | "videos">("images");

  const { data: content, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/content"],
  });

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const images = content?.filter((c) => c.type === "image") || [];
  const videos = content?.filter((c) => c.type === "video") || [];

  const addToCart = (item: Content) => {
    const cartItem: CartItem = {
      id: item.id,
      title: item.title,
      type: item.type as "image" | "video",
      thumbnailUrl: `/${item.watermarkedUrl}`,
      price: 200,
    };
    setCartItems((prev) => [...prev, cartItem]);
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("cart");
  };

  const handleCheckout = () => {
    const sessionId = Math.random().toString(36).substring(7);
    localStorage.setItem("checkoutSessionId", sessionId);
    localStorage.setItem("checkoutItems", JSON.stringify(cartItems));
    // Clear cart after checkout
    setCartItems([]);
    localStorage.removeItem("cart");
    setLocation("/checkout");
  };

  const isInCart = (id: string) => cartItems.some((item) => item.id === id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-brand-name">
              DOCUEDIT PHOTOS
            </h1>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin")}
                data-testid="button-admin"
              >
                <span className="text-sm font-medium">Admin</span>
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCartOpen(true)}
                className="relative"
                data-testid="button-cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItems.length > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    data-testid="badge-cart-count"
                  >
                    {cartItems.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "images" | "videos")} className="w-full">
          <div className="flex items-center justify-between mb-8">
            <TabsList className="bg-muted" data-testid="tabs-content-type">
              <TabsTrigger value="images" className="gap-2" data-testid="tab-images">
                <ImageIcon className="w-4 h-4" />
                Images
                {images.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {images.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-2" data-testid="tab-videos">
                <Video className="w-4 h-4" />
                Videos
                {videos.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {videos.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <p className="text-sm text-muted-foreground">
              All items <span className="text-primary font-semibold">₦200</span> each
            </p>
          </div>

          <TabsContent value="images" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="loading-skeleton-images">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20" data-testid="empty-images">
                <ImageIcon className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No images available</p>
                <p className="text-sm text-muted-foreground mt-2">Check back soon for new content</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="grid-images">
                {images.map((item) => (
                  <ContentCard
                    key={item.id}
                    content={item}
                    onAddToCart={addToCart}
                    isInCart={isInCart(item.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="loading-skeleton-videos">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20" data-testid="empty-videos">
                <Video className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No videos available</p>
                <p className="text-sm text-muted-foreground mt-2">Check back soon for new content</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-videos">
                {videos.map((item) => (
                  <ContentCard
                    key={item.id}
                    content={item}
                    onAddToCart={addToCart}
                    isInCart={isInCart(item.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
