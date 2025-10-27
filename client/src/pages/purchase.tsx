import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Download, Clock, ArrowLeft } from "lucide-react";
import { useLocation, useRoute } from "wouter";

interface PurchaseData {
  purchaseId: string;
  items: Array<{
    id: string;
    title: string;
    type: string;
    downloadToken: string;
  }>;
  expiresAt: string;
}

export default function Purchase() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/purchase/:id");
  const purchaseId = params?.id;
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { toast } = useToast();

  const { data: purchase, isLoading, refetch } = useQuery<PurchaseData>({
    queryKey: ["/api/purchase", purchaseId],
    enabled: !!purchaseId,
  });

  const completePurchaseMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const response = await apiRequest("POST", `/api/purchase/${purchaseId}/complete`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase completed successfully! Download links are now available.",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!purchase?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(purchase.expiresAt).getTime();
      const remaining = Math.max(0, expiry - now);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [purchase?.expiresAt]);

  const formatTimeLeft = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const progressPercentage = purchase?.expiresAt
    ? Math.max(0, Math.min(100, (timeLeft / (24 * 60 * 60 * 1000)) * 100))
    : 0;

  const handleDownload = async (token: string, title: string) => {
    const link = document.createElement("a");
    link.href = `/api/download/${token}`;
    link.download = title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!purchaseId) {
    setLocation("/");
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
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-purchase-title">
                Purchase Complete
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
              <div className="text-center" data-testid="loading-purchase">
                <div className="w-16 h-16 bg-muted animate-pulse rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your purchase...</p>
              </div>
            </CardContent>
          </Card>
        ) : !purchase ? (
          /* Purchase not found or not completed */
          <div className="space-y-6">
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">
                      Purchase Processing
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      Your payment is being processed. This may take a few minutes. If you've already paid, you can manually complete the purchase below.
                    </p>
                    <Button
                      onClick={() => completePurchaseMutation.mutate(purchaseId!)}
                      disabled={completePurchaseMutation.isPending}
                      className="w-full"
                    >
                      {completePurchaseMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Completing Purchase...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Complete Purchase Manually
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Message */}
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2" data-testid="text-success-message">
                      Payment Successful!
                    </h2>
                    <p className="text-muted-foreground">
                      Your payment has been processed successfully. Download your high-quality content below.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Timer */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Download Access
                  </CardTitle>
                  <Badge variant="outline" className="text-base" data-testid="badge-time-left">
                    {formatTimeLeft(timeLeft)}
                  </Badge>
                </div>
                <CardDescription>
                  Your download links will expire in 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progressPercentage} className="h-2" data-testid="progress-timer" />
              </CardContent>
            </Card>

            {/* Download Items */}
            <Card>
              <CardHeader>
                <CardTitle>Your Content</CardTitle>
                <CardDescription>
                  Click the download button to save high-quality originals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {purchase?.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-accent/50 hover-elevate"
                    data-testid={`download-item-${item.id}`}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium" data-testid={`text-download-title-${item.id}`}>
                        {item.title}
                      </h3>
                      <Badge variant="outline" className="mt-1">
                        {item.type}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleDownload(item.downloadToken, item.title)}
                      disabled={timeLeft === 0}
                      data-testid={`button-download-${item.id}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Support Info */}
            <Card>
              <CardContent className="py-6">
                <div className="text-center text-sm text-muted-foreground">
                  <p>Need help? Contact support if you experience any issues with your downloads.</p>
                  <p className="mt-2">
                    Purchase ID: <span className="font-mono text-foreground" data-testid="text-purchase-id">{purchaseId}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
