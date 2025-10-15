import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WatermarkOverlay } from "./watermark-overlay";
import { ShoppingCart, Play, Clock } from "lucide-react";
import { type Content } from "@shared/schema";

interface ContentCardProps {
  content: Content;
  onAddToCart: (content: Content) => void;
  isInCart: boolean;
}

export function ContentCard({ content, onAddToCart, isInCart }: ContentCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="overflow-hidden hover-elevate transition-transform duration-200 ease-out" data-testid={`card-content-${content.id}`}>
      <WatermarkOverlay>
        <div className={content.type === "image" ? "aspect-[4/3]" : "aspect-video"}>
          <img
            src={`/api/content/${content.id}/preview`}
            alt={content.title}
            className="w-full h-full object-cover"
            draggable={false}
            data-testid={`img-content-${content.id}`}
          />
          
          {content.type === "video" && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </div>
              
              {content.duration && (
                <Badge 
                  variant="secondary" 
                  className="absolute bottom-2 left-2 bg-black/70 text-white border-0"
                  data-testid={`badge-duration-${content.id}`}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDuration(content.duration)}
                </Badge>
              )}
            </>
          )}
        </div>
      </WatermarkOverlay>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-base line-clamp-2 flex-1" data-testid={`text-title-${content.id}`}>
            {content.title}
          </h3>
          <Badge variant="outline" className="shrink-0 bg-primary/10 text-primary border-primary/20">
            ₦200
          </Badge>
        </div>

        <Button
          onClick={() => onAddToCart(content)}
          disabled={isInCart}
          className="w-full"
          variant={isInCart ? "secondary" : "default"}
          data-testid={`button-add-cart-${content.id}`}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {isInCart ? "In Cart" : "Add to Cart"}
        </Button>
      </div>
    </Card>
  );
}
