import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { type CartItem } from "@shared/schema";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
  const [sessionId, setSessionId] = useState("");
  const [paystackLoaded, setPaystackLoaded] = useState(false);

  useEffect(() => {
    const items = localStorage.getItem("checkoutItems");
    const session = localStorage.getItem("checkoutSessionId");

    if (!items || !session) {
      setLocation("/");
      return;
    }

    setCartItems(JSON.parse(items));
    setSessionId(session);

    // Load Paystack script
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [setLocation]);

  const initPaymentMutation = useMutation({
    mutationFn: async (data: { contentIds: string[]; sessionId: string }) => {
      return await apiRequest("POST", "/api/payment/initialize", data);
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (reference: string) => {
      return await apiRequest("POST", "/api/payment/verify", { reference });
    },
    onSuccess: (data: { purchaseId: string }) => {
      localStorage.removeItem("checkoutItems");
      localStorage.removeItem("checkoutSessionId");
      setLocation(`/purchase/${data.purchaseId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePayment = async () => {
    if (!paystackLoaded) {
      toast({
        title: "Loading Payment Gateway",
        description: "Please wait a moment...",
      });
      return;
    }

    try {
      const response = await initPaymentMutation.mutateAsync({
        contentIds: cartItems.map((item) => item.id),
        sessionId,
      });

      const handler = window.PaystackPop.setup({
        key: response.publicKey,
        email: response.email,
        amount: response.amount,
        ref: response.reference,
        onClose: () => {
          toast({
            title: "Payment Cancelled",
            description: "You closed the payment window",
          });
        },
        callback: (paymentResponse) => {
          verifyPaymentMutation.mutate(paymentResponse.reference);
        },
      });

      handler.openIframe();
    } catch (error) {
      toast({
        title: "Payment Initialization Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

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
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  disabled={initPaymentMutation.isPending || verifyPaymentMutation.isPending || !paystackLoaded}
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
                      Pay with Paystack
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
    </div>
  );
}
