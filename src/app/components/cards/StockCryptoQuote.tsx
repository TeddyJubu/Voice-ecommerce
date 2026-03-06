import { TrendingUp, TrendingDown } from "lucide-react";

export interface StockCryptoQuoteProps {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
  marketCap?: string;
  volume?: string;
  high24h?: string;
  low24h?: string;
}

export function StockCryptoQuote({
  symbol,
  name,
  price,
  change,
  changePercent,
  isPositive,
  marketCap,
  volume,
  high24h,
  low24h,
}: StockCryptoQuoteProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-muted rounded-md" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{symbol}</span>
            <h3>{name}</h3>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span style={{ fontSize: '2rem', fontWeight: 300, lineHeight: 1 }}>{price}</span>
            <span
              className={`flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}
              style={{ fontSize: '0.875rem', fontWeight: 500 }}
            >
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {change} ({changePercent})
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
        {marketCap && (
          <div>
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>Market Cap</p>
            <p style={{ fontSize: '0.875rem' }}>{marketCap}</p>
          </div>
        )}
        {volume && (
          <div>
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>Volume</p>
            <p style={{ fontSize: '0.875rem' }}>{volume}</p>
          </div>
        )}
        {high24h && (
          <div>
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>24h High</p>
            <p style={{ fontSize: '0.875rem' }}>{high24h}</p>
          </div>
        )}
        {low24h && (
          <div>
            <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>24h Low</p>
            <p style={{ fontSize: '0.875rem' }}>{low24h}</p>
          </div>
        )}
      </div>
    </div>
  );
}
