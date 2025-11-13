import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { type Purchase } from "@shared/schema";
import { Copy, ExternalLink, Receipt, Loader2, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function HistorySection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: purchases, isLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  });

  const completePurchaseMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const response = await apiRequest("POST", `/api/purchase/${purchaseId}/complete`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase marked as completed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyTrackingLink = (purchaseId: string) => {
    const link = `${window.location.origin}/purchase/${purchaseId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Tracking link copied to clipboard",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Transaction History</h2>
          <p className="text-muted-foreground">
            View all completed transactions and tracking links
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Transaction History</h2>
        <p className="text-muted-foreground">
          View all completed transactions and tracking links
        </p>
      </div>

      {!purchases || purchases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className="text-muted-foreground text-center">
              Customer purchases will appear here once they complete payment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <Card key={purchase.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={purchase.status === 'completed' ? 'default' : purchase.status === 'pending' ? 'secondary' : 'destructive'}
                      >
                        {purchase.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(purchase.createdAt)}
                      </span>
                    </div>

                    {/* Customer Information */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer:</span>
                          <span className="font-medium ml-1">{purchase.userName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ID:</span>
                          <span className="font-mono text-xs bg-accent/50 px-2 py-1 rounded ml-1">
                            {purchase.uniqueId || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Items</p>
                        <p className="font-medium">
                          {purchase.contentIds.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-semibold text-primary">
                          ₦{purchase.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reference</p>
                        <p className="font-mono text-xs truncate">
                          {purchase.paystackReference}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tracking Code</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={purchase.trackingCode || "N/A"}
                            readOnly
                            className="flex-1 px-2 py-1 text-sm font-mono font-bold uppercase bg-accent/50 border border-border rounded text-center"
                          />
                          <Button
                            onClick={() => {
                              if (purchase.trackingCode) {
                                navigator.clipboard.writeText(purchase.trackingCode);
                                toast({
                                  title: "Copied!",
                                  description: "Tracking code copied",
                                });
                              }
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Download Link</p>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => copyTrackingLink(purchase.id)}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Link
                          </Button>
                          <Button
                            onClick={() => window.open(`/purchase/${purchase.id}`, '_blank')}
                            size="sm"
                            variant="outline"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Manual completion button for pending purchases */}
                    {purchase.status === 'pending' && (
                      <div className="pt-2 border-t">
                        <Button
                          onClick={() => completePurchaseMutation.mutate(purchase.id)}
                          size="sm"
                          variant="default"
                          className="w-full"
                          disabled={completePurchaseMutation.isPending}
                        >
                          {completePurchaseMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Manually Complete Purchase
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
