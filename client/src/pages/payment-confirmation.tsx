import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { CheckCircle2, XCircle, Clock, Copy, Download, ArrowLeft, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PaymentConfirmationData {
  purchaseId: string;
  trackingCode: string;
  reference: string;
  status: "completed" | "pending" | "failed";
  paystackStatus: string;
  message: string;
  items?: Array<{
    id: string;
    title: string;
    type: string;
    downloadToken: string;
  }>;
  expiresAt?: string;
}

export default function PaymentConfirmation() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/payment-confirmation");
  const { toast } = useToast();
  const [reference, setReference] = useState<string | null>(null);

  // Get reference from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("reference");
    if (ref) {
      setReference(ref);
    } else {
      // If no reference, redirect to home
      setLocation("/");
    }
  }, [setLocation]);

  // Verify payment and get status
  const { data: confirmationData, isLoading, error } = useQuery<PaymentConfirmationData>({
    queryKey: ["/api/payment/verify", reference],
    enabled: !!reference,
    queryFn: async () => {
      if (!reference) throw new Error("No reference provided");
      const response = await apiRequest("POST", "/api/payment/verify", { reference });
      return await response.json();
    },
    retry: false,
  });

  const copyReference = () => {
    if (confirmationData?.reference) {
      navigator.clipboard.writeText(confirmationData.reference);
      toast({
        title: "Copied!",
        description: "Transaction ID copied to clipboard",
      });
    }
  };

  const getStatusIcon = () => {
    if (!confirmationData) return null;
    switch (confirmationData.status) {
      case "completed":
        return <CheckCircle2 className="w-16 h-16 text-green-500" />;
      case "pending":
        return <Clock className="w-16 h-16 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Clock className="w-16 h-16 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    if (!confirmationData) return null;
    switch (confirmationData.status) {
      case "completed":
        return <Badge className="bg-green-500">Payment Successful</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Payment Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500">Payment Failed</Badge>;
      default:
        return <Badge>Unknown Status</Badge>;
    }
  };

  const handleDownload = () => {
    if (confirmationData?.purchaseId) {
      setLocation(`/purchase/${confirmationData.purchaseId}`);
    }
  };

  if (!reference) {
    return null;
  }

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
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold font-display">
                Payment Confirmation
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted animate-pulse rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Verifying payment...</p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Verification Error</h2>
                  <p className="text-muted-foreground mb-4">
                    {error instanceof Error ? error.message : "Failed to verify payment. Please try again later."}
                  </p>
                  <Button onClick={() => setLocation("/")} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : confirmationData ? (
          <div className="space-y-6">
            {/* Status Card */}
            <Card className={confirmationData.status === "completed" 
              ? "border-green-500/20 bg-green-500/5" 
              : confirmationData.status === "pending"
              ? "border-yellow-500/20 bg-yellow-500/5"
              : "border-red-500/20 bg-red-500/5"
            }>
              <CardContent className="py-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  {getStatusIcon()}
                  <div className="space-y-2">
                    {getStatusBadge()}
                    <h2 className="text-2xl font-semibold">
                      {confirmationData.status === "completed" 
                        ? "Payment Successful!" 
                        : confirmationData.status === "pending"
                        ? "Payment Processing"
                        : "Payment Failed"
                      }
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                      {confirmationData.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Details */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
                <CardDescription>
                  Save this transaction ID for your records. You can use it to check your order status anytime.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Transaction ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={confirmationData.reference}
                      readOnly
                      className="flex-1 px-3 py-2 text-lg font-mono font-bold uppercase text-center bg-accent border border-border rounded-md tracking-wider"
                    />
                    <Button
                      onClick={copyReference}
                      size="icon"
                      variant="outline"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this ID in the complaints and disputes box to check your order status
                  </p>
                </div>

                {confirmationData.trackingCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Tracking Code
                    </label>
                    <p className="px-3 py-2 text-lg font-mono font-bold uppercase bg-accent border border-border rounded-md">
                      {confirmationData.trackingCode}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              {confirmationData.status === "completed" ? (
                <Button
                  onClick={handleDownload}
                  className="flex-1 h-12 text-base"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download All Items
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setLocation("/complaints-disputes")}
                    className="flex-1 h-12 text-base"
                    variant="outline"
                    size="lg"
                  >
                    Check Status Again
                  </Button>
                  <Button
                    onClick={() => setLocation("/")}
                    className="flex-1 h-12 text-base"
                    variant="outline"
                    size="lg"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Back to Cart
                  </Button>
                </>
              )}
            </div>

            {/* Help Text */}
            <Card>
              <CardContent className="py-6">
                <div className="text-center text-sm text-muted-foreground">
                  <p>
                    Need help? Contact support with your Transaction ID:{" "}
                    <span className="font-mono text-foreground font-semibold">
                      {confirmationData.reference}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}

