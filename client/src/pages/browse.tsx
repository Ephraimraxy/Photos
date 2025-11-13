import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { CartSidebar } from "@/components/cart-sidebar";
import { ContentCard } from "@/components/content-card";
import { ShoppingCart, Image as ImageIcon, Video, QrCode, Gift, Search, X } from "lucide-react";
import { type Content, type CartItem } from "@shared/schema";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Browse() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCoupon, setActiveCoupon] = useState<{
    couponId: string;
    imageCount: number;
    videoCount: number;
    code: string;
  } | null>(null);
  const [trackingCode, setTrackingCode] = useState<string>(() => {
    const saved = localStorage.getItem("trackingCode");
    if (saved) return saved;
    
    // Generate new 8-character tracking code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem("trackingCode", code);
    return code;
  });
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<"images" | "videos">("images");

  const { data: content, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/content"],
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const images = content?.filter((c) => 
    c.type === "image" && 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  const videos = content?.filter((c) => 
    c.type === "video" && 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const addToCart = (item: Content) => {
    // Check coupon limits if active
    if (activeCoupon) {
      const currentImages = cartItems.filter(cartItem => cartItem.type === "image").length;
      const currentVideos = cartItems.filter(cartItem => cartItem.type === "video").length;
      
      // Check if adding this item would exceed coupon limits
      if (item.type === "image" && currentImages >= activeCoupon.imageCount) {
        toast({
          title: "Coupon Limit Reached",
          description: `You can only select ${activeCoupon.imageCount} images with this coupon. You can still add more items but will need to pay for extras.`,
          variant: "destructive",
        });
        return;
      }
      
      if (item.type === "video" && currentVideos >= activeCoupon.videoCount) {
        toast({
          title: "Coupon Limit Reached", 
          description: `You can only select ${activeCoupon.videoCount} videos with this coupon. You can still add more items but will need to pay for extras.`,
          variant: "destructive",
        });
        return;
      }
    }

    const cartItem: CartItem = {
      id: item.id,
      title: item.title,
      type: item.type as "image" | "video",
      thumbnailUrl: `/api/content/${item.id}/preview`,
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

  const clearCoupon = () => {
    setActiveCoupon(null);
    toast({
      title: "Coupon Removed",
      description: "Coupon has been cleared from your session",
    });
  };

  const handleCheckout = () => {
    // Check if cart meets coupon requirements
    if (activeCoupon) {
      const currentImages = cartItems.filter(cartItem => cartItem.type === "image").length;
      const currentVideos = cartItems.filter(cartItem => cartItem.type === "video").length;
      
      // Must meet minimum coupon requirements
      if (currentImages < activeCoupon.imageCount || currentVideos < activeCoupon.videoCount) {
        toast({
          title: "Coupon Requirements Not Met",
          description: `You must select at least ${activeCoupon.imageCount} images and ${activeCoupon.videoCount} videos to use this coupon. Current: ${currentImages} images, ${currentVideos} videos.`,
          variant: "destructive",
        });
        return;
      }

      // Show payment breakdown for excess items
      const excessImages = Math.max(0, currentImages - activeCoupon.imageCount);
      const excessVideos = Math.max(0, currentVideos - activeCoupon.videoCount);
      const excessTotal = (excessImages + excessVideos) * 200;

      if (excessTotal > 0) {
        toast({
          title: "Payment Required for Excess Items",
          description: `You have ${excessImages} extra images and ${excessVideos} extra videos. You'll pay ₦${excessTotal} for these items.`,
        });
      } else {
        toast({
          title: "Coupon Applied Successfully",
          description: `Your coupon covers all selected items. No payment required!`,
        });
      }
    }

    localStorage.setItem("checkoutItems", JSON.stringify(cartItems));
    if (activeCoupon) {
      localStorage.setItem("activeCoupon", JSON.stringify(activeCoupon));
    }
    setCartItems([]);
    localStorage.removeItem("cart");
    setLocation("/checkout");
  };

  const isInCart = (id: string) => cartItems.some((item) => item.id === id);

  const lookupMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/tracking/lookup", { trackingCode: code });
      return await response.json();
    },
    onSuccess: (data: any) => {
      // Always redirect to tracking page for detailed view
      setLocation(`/tracking?code=${data.trackingCode}`);
      setCodeDialogOpen(false);
      setLookupCode("");
    },
    onError: () => {
      toast({
        title: "Invalid Code",
        description: "The tracking code you entered is not valid.",
        variant: "destructive",
      });
    },
  });

  const handleLookupCode = () => {
    if (!lookupCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter a tracking code",
        variant: "destructive",
      });
      return;
    }
    lookupMutation.mutate(lookupCode.trim().toUpperCase());
  };

  const couponValidationMutation = useMutation({
    mutationFn: async (data: { code: string; userName: string }) => {
      return await apiRequest("POST", "/api/coupons/validate", data);
    },
    onSuccess: (data) => {
      setActiveCoupon({
        couponId: data.couponId,
        imageCount: data.imageCount,
        videoCount: data.videoCount,
        code: couponCode.trim().toUpperCase(),
      });
      toast({
        title: "Coupon Validated!",
        description: data.message,
      });
      setCouponDialogOpen(false);
      setCouponCode("");
      setUserName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid Coupon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCouponValidation = () => {
    if (!couponCode.trim() || !userName.trim()) {
      toast({
        title: "Required Fields",
        description: "Please enter both coupon code and your name",
        variant: "destructive",
      });
      return;
    }
    couponValidationMutation.mutate({
      code: couponCode.trim().toUpperCase(),
      userName: userName.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-brand-name">
                DOCUEDIT PHOTOS
              </h1>
              {activeCoupon && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1">
                  <Gift className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">
                    Coupon: {activeCoupon.code} ({activeCoupon.imageCount} images, {activeCoupon.videoCount} videos)
                  </span>
                  <div className="text-xs text-green-600">
                    {(() => {
                      const currentImages = cartItems.filter(cartItem => cartItem.type === "image").length;
                      const currentVideos = cartItems.filter(cartItem => cartItem.type === "video").length;
                      const remainingImages = Math.max(0, activeCoupon.imageCount - currentImages);
                      const remainingVideos = Math.max(0, activeCoupon.videoCount - currentVideos);
                      
                      if (remainingImages > 0 || remainingVideos > 0) {
                        return `Need: ${remainingImages} images, ${remainingVideos} videos`;
                      } else {
                        return "Requirements met ✓";
                      }
                    })()}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCoupon}
                    className="h-6 w-6 p-0 text-green-700 hover:text-green-800"
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                    data-testid="button-have-code"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Complaint and Disputes
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-tracking-code">
                  <DialogHeader>
                    <DialogTitle>Enter Your Tracking Code</DialogTitle>
                    <DialogDescription>
                      Enter the code you received to track your order or access your downloads
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="tracking-code">Tracking Code</Label>
                      <Input
                        id="tracking-code"
                        value={lookupCode}
                        onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                        placeholder="Enter your code (e.g., ABC12345)"
                        className="font-mono uppercase"
                        data-testid="input-tracking-code"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleLookupCode();
                          }
                        }}
                      />
                    </div>
                    <Button
                      onClick={handleLookupCode}
                      disabled={lookupMutation.isPending}
                      className="w-full"
                      data-testid="button-lookup-code"
                    >
                      {lookupMutation.isPending ? "Looking up..." : "Track Order"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                    data-testid="button-coupon"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Use Coupon
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-coupon">
                  <DialogHeader>
                    <DialogTitle>Enter Your Coupon Code</DialogTitle>
                    <DialogDescription>
                      Enter your coupon code and name to validate and get free content
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="coupon-code">Coupon Code</Label>
                      <Input
                        id="coupon-code"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCouponValidation();
                          }
                        }}
                        data-testid="input-coupon-code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-name">Your Name</Label>
                      <Input
                        id="user-name"
                        placeholder="Enter your full name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCouponValidation();
                          }
                        }}
                        data-testid="input-user-name"
                      />
                    </div>
                    <Button
                      onClick={handleCouponValidation}
                      disabled={couponValidationMutation.isPending}
                      className="w-full"
                      data-testid="button-validate-coupon"
                    >
                      {couponValidationMutation.isPending ? "Validating..." : "Validate Coupon"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
              data-testid="input-search-content"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

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
