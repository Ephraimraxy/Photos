import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Search, Download, Clock, CheckCircle2, XCircle, AlertCircle, Copy } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TrackingData {
  purchaseId: string;
  trackingCode: string;
  status: string;
  totalAmount: number;
  items: Array<{
    id: string;
    title: string;
    type: string;
    thumbnailUrl: string;
  }>;
  createdAt: string;
  userName?: string;
  uniqueId?: string;
  paystackReference?: string;
}

export default function Tracking() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/tracking");
  const { toast } = useToast();
  const [trackingCode, setTrackingCode] = useState("");
  const [searchCode, setSearchCode] = useState("");

  // Check for tracking code in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
      setTrackingCode(codeFromUrl);
      setSearchCode(codeFromUrl);
    }
  }, []);

  const lookupMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/tracking/lookup", { trackingCode: code });
      return await response.json();
    },
    onSuccess: (data: TrackingData) => {
      setTrackingCode(data.trackingCode);
    },
    onError: () => {
      toast({
        title: "Invalid Code",
        description: "The tracking code you entered is not valid.",
        variant: "destructive",
      });
    },
  });

  const { data: trackingData, isLoading } = useQuery<TrackingData>({
    queryKey: ["/api/tracking/lookup", trackingCode],
    enabled: !!trackingCode,
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/tracking/lookup", { trackingCode });
      return await response.json();
    },
  });

  const handleSearch = () => {
    if (!searchCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter a tracking code",
        variant: "destructive",
      });
      return;
    }
    lookupMutation.mutate(searchCode.trim().toUpperCase());
  };

  const copyTrackingCode = () => {
    if (trackingData?.trackingCode) {
      navigator.clipboard.writeText(trackingData.trackingCode);
      toast({
        title: "Copied!",
        description: "Tracking code copied to clipboard",
      });
    }
  };

  const copyPurchaseLink = () => {
    if (trackingData?.purchaseId) {
      const link = `${window.location.origin}/purchase/${trackingData.purchaseId}`;
      navigator.clipboard.writeText(link);
      toast({
        title: "Copied!",
        description: "Purchase link copied to clipboard",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "completed":
        return "Payment successful! Your order is ready for download.";
      case "pending":
        return "Payment is being processed. Please check back in a few minutes.";
      case "failed":
        return "Payment failed. Please try again or contact support.";
      default:
        return "Unknown status. Please contact support.";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              <h1 className="text-2xl md:text-3xl font-bold font-display">
                Track Your Order
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {!trackingData ? (
          /* Search Form */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Enter Your Tracking Code
              </CardTitle>
              <CardDescription>
                Enter your tracking code to view order details and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tracking-code">Tracking Code</Label>
                <Input
                  id="tracking-code"
                  placeholder="Enter your tracking code (e.g., CART0MASPNQ4)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="font-mono uppercase"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={lookupMutation.isPending}
                className="w-full"
              >
                {lookupMutation.isPending ? "Looking up..." : "Track Order"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Order Details */
          <div className="space-y-6">
            {/* Status Card */}
            <Card className={trackingData.status === "completed" ? "border-green-500/20 bg-green-500/5" : 
                              trackingData.status === "pending" ? "border-yellow-500/20 bg-yellow-500/5" : 
                              "border-red-500/20 bg-red-500/5"}>
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  {getStatusIcon(trackingData.status)}
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">
                      Order Status: {trackingData.status.toUpperCase()}
                    </h2>
                    <p className="text-muted-foreground">
                      {getStatusMessage(trackingData.status)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
                <CardDescription>
                  Details about your purchase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Tracking Code</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={trackingData.trackingCode}
                        readOnly
                        className="flex-1 px-3 py-2 text-lg font-mono font-bold uppercase text-center bg-accent border border-border rounded-md tracking-wider"
                      />
                      <Button
                        onClick={copyTrackingCode}
                        size="sm"
                        variant="outline"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Order Date</Label>
                    <p className="mt-1 font-medium">{formatDate(trackingData.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Total Amount</Label>
                    <p className="mt-1 font-bold text-primary text-lg">₦{trackingData.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Items</Label>
                    <p className="mt-1 font-medium">{trackingData.items.length} item(s)</p>
                  </div>
                </div>

                {/* Customer Information */}
                {(trackingData.userName || trackingData.uniqueId) && (
                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-3">Customer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trackingData.userName && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Customer Name</Label>
                          <p className="mt-1 font-medium">{trackingData.userName}</p>
                        </div>
                      )}
                      {trackingData.uniqueId && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Customer ID</Label>
                          <p className="mt-1 font-mono text-sm bg-accent/50 px-2 py-1 rounded">
                            {trackingData.uniqueId}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {trackingData.paystackReference && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Payment Reference</Label>
                    <p className="mt-1 font-mono text-sm bg-accent/50 px-2 py-1 rounded">
                      {trackingData.paystackReference}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>
                  Items included in this order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trackingData.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-accent/50"
                    >
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge variant="outline" className="mt-1">
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              {trackingData.status === "completed" && (
                <Button
                  onClick={() => setLocation(`/purchase/${trackingData.purchaseId}`)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Files
                </Button>
              )}
              <Button
                onClick={copyPurchaseLink}
                variant="outline"
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Order Link
              </Button>
              <Button
                onClick={() => {
                  setTrackingCode("");
                  setSearchCode("");
                }}
                variant="outline"
              >
                Track Another Order
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
