import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Coupon } from "@shared/schema";
import { Gift, Copy, Loader2, Plus, CheckCircle, XCircle } from "lucide-react";

export default function CouponsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageCount, setImageCount] = useState(1);
  const [videoCount, setVideoCount] = useState(0);
  const [generatedCoupon, setGeneratedCoupon] = useState<string | null>(null);

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: { imageCount: number; videoCount: number }) => {
      return await apiRequest("POST", "/api/coupons", data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setGeneratedCoupon(response.code);
      toast({
        title: "Coupon Generated!",
        description: "New coupon code has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Coupon Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateCoupon = () => {
    if (imageCount < 0 || videoCount < 0) {
      toast({
        title: "Invalid Values",
        description: "Counts cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (imageCount === 0 && videoCount === 0) {
      toast({
        title: "Invalid Values",
        description: "At least one count must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    createCouponMutation.mutate({
      imageCount,
      videoCount,
    });
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Coupon code copied to clipboard",
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
          <h2 className="text-3xl font-bold">Coupon Management</h2>
          <p className="text-muted-foreground">
            Generate and manage free access coupons
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Coupon Management</h2>
        <p className="text-muted-foreground">
          Generate and manage free access coupons for your customers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate Coupon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Generate New Coupon
            </CardTitle>
            <CardDescription>
              Create a coupon code for free access to content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="image-count">Images</Label>
                <Input
                  id="image-count"
                  type="number"
                  min="0"
                  value={imageCount}
                  onChange={(e) => setImageCount(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-count">Videos</Label>
                <Input
                  id="video-count"
                  type="number"
                  min="0"
                  value={videoCount}
                  onChange={(e) => setVideoCount(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Coupon will allow:</p>
              <div className="space-y-1">
                {imageCount > 0 && (
                  <p className="text-sm font-medium">
                    • {imageCount} free image{imageCount > 1 ? 's' : ''}
                  </p>
                )}
                {videoCount > 0 && (
                  <p className="text-sm font-medium">
                    • {videoCount} free video{videoCount > 1 ? 's' : ''}
                  </p>
                )}
                {imageCount === 0 && videoCount === 0 && (
                  <p className="text-sm text-muted-foreground">No content selected</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleGenerateCoupon}
              disabled={createCouponMutation.isPending || (imageCount === 0 && videoCount === 0)}
              className="w-full"
            >
              {createCouponMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Coupon
                </>
              )}
            </Button>

            {generatedCoupon && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                  Coupon Generated Successfully!
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedCoupon}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm font-mono font-bold uppercase bg-white dark:bg-gray-900 border border-green-300 dark:border-green-700 rounded text-center"
                  />
                  <Button
                    onClick={() => copyCouponCode(generatedCoupon)}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Share this code with your customers for free access
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coupon History */}
        <Card>
          <CardHeader>
            <CardTitle>Coupon History</CardTitle>
            <CardDescription>
              Track all generated coupons and their usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!coupons || coupons.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No coupons generated yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="p-3 border border-border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-accent px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                        <Badge variant={coupon.used ? "destructive" : "default"}>
                          {coupon.used ? "Used" : "Available"}
                        </Badge>
                      </div>
                      <Button
                        onClick={() => copyCouponCode(coupon.code)}
                        size="sm"
                        variant="ghost"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span>
                          {coupon.imageCount} image{coupon.imageCount !== 1 ? 's' : ''}
                        </span>
                        <span>
                          {coupon.videoCount} video{coupon.videoCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div>
                        Created: {formatDate(coupon.createdAt)}
                      </div>
                      {coupon.used && coupon.usedBy && (
                        <div>
                          Used by: {coupon.usedBy} on {coupon.usedAt ? formatDate(coupon.usedAt) : 'Unknown'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
