import { Star, ExternalLink } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { pollinationsImageUrl } from "../../../lib/pollinations";

export interface Product {
  title: string;
  price?: string;
  image?: string;
  imagePrompt?: string;
  rating?: number;
  link: string;
  source?: string;
}

export interface ProductShowcaseProps {
  products: Product[];
  query?: string;
}

export function ProductShowcase({ products, query }: ProductShowcaseProps) {
  return (
    <div className="space-y-3">
      {query && (
        <h3 className="px-1">Results for "{query}"</h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((p, i) => {
          const imageSrc = p.image ||
            (p.imagePrompt ? pollinationsImageUrl(p.imagePrompt, { width: 200, height: 200 }) : null);
          return (
          <a
            key={i}
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
          >
            {imageSrc && (
              <div className="aspect-square bg-gray-50 p-4 flex items-center justify-center">
                <ImageWithFallback
                  src={imageSrc}
                  alt={p.title}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-4">
              <h4 className="line-clamp-2 group-hover:text-blue-700 transition-colors">{p.title}</h4>
              <div className="flex items-center justify-between mt-2">
                <span className="text-primary" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  {p.price || "Price not found"}
                </span>
                {p.rating && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span style={{ fontSize: '0.875rem' }}>{p.rating}</span>
                  </div>
                )}
              </div>
              {p.source && (
                <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  <span style={{ fontSize: '0.75rem' }}>{p.source}</span>
                </div>
              )}
            </div>
          </a>
          );
        })}
      </div>
    </div>
  );
}
