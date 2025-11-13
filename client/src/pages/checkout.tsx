import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Loader2, CheckCircle2, Copy, Download, User } from "lucide-react";
import { type CartItem } from "@shared/schema";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [trackingCode, setTrackingCode] = useState("");
  const [userName, setUserName] = useState("");
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [purchaseData, setPurchaseData] = useState<{ purchaseId: string; trackingCode: string; trackingLink: string; total: number; itemCount: number } | null>(null);
  const [activeCoupon, setActiveCoupon] = useState<{
    couponId: string;
    imageCount: number;
    videoCount: number;
    code: string;
  } | null>(null);

  // Initialize payment mutation
  const initPaymentMutation = useMutation({
    mutationFn: async (data: { contentIds: string[]; trackingCode: string; userName: string; couponCode?: string }) => {
      const response = await apiRequest("POST", "/api/payment/initialize", data);
      return await response.json();
    },
    onError: (error: any) => {
      console.error("Payment initialization error:", error);
      
      // Handle duplicate tracking code error
      if (error.code === "DUPLICATE_TRACKING_CODE" || error.message?.includes("tracking code")) {
        // Generate new tracking code
        const newCode = `CART${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        localStorage.setItem("trackingCode", newCode);
        setTrackingCode(newCode);
        toast({
          title: "Session Refreshed",
          description: "Please try your payment again.",
        });
      } else {
        // Handle other errors
        toast({
          title: "Payment Error",
          description: error.message || "Failed to initialize payment. Please check your configuration.",
          variant: "destructive",
        });
      }
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (reference: string) => {
      const response = await apiRequest("POST", "/api/payment/verify", { reference });
      return await response.json();
    },
    onSuccess: (data: { purchaseId: string; trackingCode: string }) => {
      console.log("Payment verification successful:", data);
      const trackingLink = `${window.location.origin}/purchase/${data.purchaseId}`;
      const total = cartItems.reduce((sum, item) => sum + item.price, 0);
      
      setPurchaseData({
        purchaseId: data.purchaseId,
        trackingCode: data.trackingCode,
        trackingLink,
        total,
        itemCount: cartItems.length,
      });
      setShowSuccessDialog(true);
      
      // Clear tracking code state and storage after successful purchase
      localStorage.removeItem("trackingCode");
      setTrackingCode("");
      
      // Start countdown for redirect
      let countdown = 3;
      setRedirectCountdown(countdown);
      const countdownInterval = setInterval(() => {
        countdown--;
        setRedirectCountdown(countdown);
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          setLocation(`/purchase/${data.purchaseId}`);
        }
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Verification Failed",
        description: error.message,
        variant: "destructive",
      });
      // Generate new tracking code on error to allow retry
      const newCode = `CART${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      localStorage.setItem("trackingCode", newCode);
      setTrackingCode(newCode);
    },
  });

  useEffect(() => {
    const items = localStorage.getItem("checkoutItems");
    const code = localStorage.getItem("trackingCode");
    const coupon = localStorage.getItem("activeCoupon");

    if (!items || !code) {
      setLocation("/");
      return;
    }

    setCartItems(JSON.parse(items));
    setTrackingCode(code);
    
    if (coupon) {
      setActiveCoupon(JSON.parse(coupon));
    }

    // Check if returning from Paystack payment
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    
    if (reference) {
      console.log("Payment reference found:", reference);
      console.log("Starting payment verification...");
      // Verify the payment
      verifyPaymentMutation.mutate(reference);
      // Clean up URL
      window.history.replaceState({}, '', '/checkout');
    }

    // Load Paystack script
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [setLocation, verifyPaymentMutation]);

  const handlePayment = async () => {
    if (!paystackLoaded) {
      toast({
        title: "Loading Payment Gateway",
        description: "Please wait a moment...",
      });
      return;
    }

    if (!userName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name to proceed with payment",
        variant: "destructive",
      });
      return;
    }

    try {
      const paymentData: any = {
        contentIds: cartItems.map((item) => item.id),
        trackingCode,
        userName: userName.trim(),
      };

      // Only include coupon code if there's an active coupon
      if (activeCoupon?.code) {
        paymentData.couponCode = activeCoupon.code;
      }

      const response = await initPaymentMutation.mutateAsync(paymentData);

      console.log("Payment response:", response);
      console.log("Authorization URL:", response.authorizationUrl);
      console.log("Response keys:", Object.keys(response));

      // Check if response contains an error
      if (response.error) {
        console.error("Payment initialization error:", response.error);
        toast({
          title: "Payment Configuration Error",
          description: response.error,
          variant: "destructive",
        });
        return;
      }

      // Always use authorization URL if available
      if (response.authorizationUrl) {
        console.log("Redirecting to authorization URL:", response.authorizationUrl);
        window.location.href = response.authorizationUrl;
        return; // Exit early to prevent inline fallback
      } else {
        console.error("No authorization URL received from server");
        toast({
          title: "Payment Error",
          description: "Unable to initialize payment. Please try again.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      toast({
        title: "Payment Initialization Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // Calculate total with coupon discount
  const calculateTotal = () => {
    const baseTotal = cartItems.reduce((sum, item) => sum + item.price, 0);
    
    if (activeCoupon) {
      const currentImages = cartItems.filter(item => item.type === "image").length;
      const currentVideos = cartItems.filter(item => item.type === "video").length;
      
      // Calculate excess items beyond coupon limits
      const excessImages = Math.max(0, currentImages - activeCoupon.imageCount);
      const excessVideos = Math.max(0, currentVideos - activeCoupon.videoCount);
      
      // Only charge for excess items
      return (excessImages + excessVideos) * 200;
    }
    
    return baseTotal;
  };

  const total = calculateTotal();

  const copyTrackingLink = () => {
    if (purchaseData?.trackingLink) {
      navigator.clipboard.writeText(purchaseData.trackingLink);
      toast({
        title: "Copied!",
        description: "Tracking link copied to clipboard",
      });
    }
  };

  const proceedToDownload = () => {
    if (purchaseData) {
      // Clear all purchase-related data
      localStorage.removeItem("checkoutItems");
      localStorage.removeItem("cart");
      localStorage.removeItem("trackingCode");
      
      // Clear state for next purchase
      setTrackingCode("");
      setCartItems([]);
      
      setLocation(`/purchase/${purchaseData.purchaseId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
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
              <h1 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-checkout-title">
                Checkout
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  Review your items before completing purchase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 rounded-lg bg-accent/50"
                    data-testid={`checkout-item-${item.id}`}
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-20 h-20 object-cover rounded-md"
                      data-testid={`img-checkout-${item.id}`}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium line-clamp-2" data-testid={`text-checkout-title-${item.id}`}>
                        {item.title}
                      </h3>
                      <Badge variant="outline" className="mt-1">
                        {item.type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary" data-testid={`text-checkout-price-${item.id}`}>
                        ₦{item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Payment Card */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
                <CardDescription>
                  Enter your details to complete the purchase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* User Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="user-name" className="text-sm font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="user-name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-10"
                      data-testid="input-user-name"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will be used to generate your unique purchase ID
                  </p>
                </div>

                <Separator />

                {/* Coupon Status */}
                {activeCoupon && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">Coupon Applied</span>
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                      Coupon: {activeCoupon.code} - {activeCoupon.imageCount} images, {activeCoupon.videoCount} videos free
                    </p>
                    {(() => {
                      const currentImages = cartItems.filter(item => item.type === "image").length;
                      const currentVideos = cartItems.filter(item => item.type === "video").length;
                      const excessImages = Math.max(0, currentImages - activeCoupon.imageCount);
                      const excessVideos = Math.max(0, currentVideos - activeCoupon.videoCount);
                      
                      if (excessImages > 0 || excessVideos > 0) {
                        return (
                          <p className="text-sm text-orange-700">
                            You have {excessImages} extra images and {excessVideos} extra videos. 
                            You'll pay ₦{(excessImages + excessVideos) * 200} for these items.
                          </p>
                        );
                      } else {
                        return (
                          <p className="text-sm text-green-700">
                            All items covered by coupon. No payment required!
                          </p>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* Order Summary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span data-testid="text-items-count">{cartItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Price per item</span>
                    <span>₦200</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">Total</span>
                    <span className="font-bold text-2xl text-primary" data-testid="text-checkout-total">
                      ₦{total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={initPaymentMutation.isPending || verifyPaymentMutation.isPending || !paystackLoaded || !userName.trim()}
                  className="w-full h-12 text-base"
                  style={{ backgroundColor: '#00C3A0' }}
                  data-testid="button-pay-paystack"
                >
                  {initPaymentMutation.isPending || verifyPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Proceed to Payment
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Secure payment powered by Paystack
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-payment-success">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" data-testid="icon-success" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl" data-testid="text-success-title">
              Payment Successful!
            </DialogTitle>
            <DialogDescription className="text-center" data-testid="text-success-description">
              Your purchase has been completed successfully
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Items Purchased</span>
                <span className="font-semibold" data-testid="text-success-item-count">
                  {purchaseData?.itemCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Amount Paid</span>
                <span className="font-bold text-primary" data-testid="text-success-amount">
                  ₦{purchaseData?.total.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Tracking Code</label>
              <p className="text-xs text-muted-foreground">
                Save this code to track your order or access downloads later
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={purchaseData?.trackingCode || ""}
                  readOnly
                  className="flex-1 px-3 py-2 text-lg font-mono font-bold uppercase text-center bg-accent border border-border rounded-md tracking-wider"
                  data-testid="input-tracking-code-display"
                />
                <Button
                  onClick={() => {
                    if (purchaseData?.trackingCode) {
                      navigator.clipboard.writeText(purchaseData.trackingCode);
                      toast({
                        title: "Copied!",
                        description: "Tracking code copied to clipboard",
                      });
                    }
                  }}
                  size="icon"
                  variant="outline"
                  data-testid="button-copy-code"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2">
            <p className="text-sm text-primary text-center">
              Redirecting to download page in {redirectCountdown} seconds...
            </p>
            <div className="flex gap-2 w-full">
              <Button
                onClick={proceedToDownload}
                className="flex-1"
                data-testid="button-proceed-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Go to Downloads Now
              </Button>
              <Button
                onClick={() => setShowSuccessDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
