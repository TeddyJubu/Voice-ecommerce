import { MapPin, Star, Navigation } from "lucide-react";

export interface Place {
  name: string;
  address: string;
  rating?: number;
  distance?: string;
  type?: string;
}

export interface MapPlacesListProps {
  title: string;
  places: Place[];
}

export function MapPlacesList({ title, places }: MapPlacesListProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-red-500" />
          <h3>{title}</h3>
        </div>
      </div>
      <div className="divide-y divide-border">
        {places.map((place, i) => (
          <div key={i} className="p-4 hover:bg-accent/30 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h4>{place.name}</h4>
                <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.875rem' }}>{place.address}</p>
                {place.type && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-muted rounded-full text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                    {place.type}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                {place.rating && (
                  <div className="flex items-center gap-1 text-amber-500" style={{ fontSize: '0.875rem' }}>
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {place.rating}
                  </div>
                )}
                {place.distance && (
                  <div className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                    <Navigation className="h-3 w-3" />
                    {place.distance}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
