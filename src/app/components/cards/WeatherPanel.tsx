import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets } from "lucide-react";

export interface HourlyForecast {
  time: string;
  temp: string;
  icon: "sun" | "cloud" | "rain" | "snow";
}

export interface WeatherPanelProps {
  location: string;
  date: string;
  summary: string;
  currentTemp: string;
  high: string;
  low: string;
  humidity: string;
  wind: string;
  icon: "sun" | "cloud" | "rain" | "snow";
  hourly?: HourlyForecast[];
}

const iconMap = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
};

export function WeatherPanel({
  location,
  date,
  summary,
  currentTemp,
  high,
  low,
  humidity,
  wind,
  icon,
  hourly,
}: WeatherPanelProps) {
  const WeatherIcon = iconMap[icon];

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-blue-50 to-sky-50 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3>{location}</h3>
            <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>{date}</p>
          </div>
          <WeatherIcon className="h-10 w-10 text-blue-500" />
        </div>
        <div className="mt-4">
          <span style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1 }} className="text-primary">{currentTemp}</span>
        </div>
        <p className="text-muted-foreground mt-2">{summary}</p>
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            <span className="text-red-400">↑</span> {high}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            <span className="text-blue-400">↓</span> {low}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            <Droplets className="h-3.5 w-3.5" /> {humidity}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            <Wind className="h-3.5 w-3.5" /> {wind}
          </div>
        </div>
      </div>
      {hourly && hourly.length > 0 && (
        <div className="border-t border-border/50 px-5 py-3 flex gap-4 overflow-x-auto">
          {hourly.map((h, i) => {
            const HIcon = iconMap[h.icon];
            return (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>{h.time}</span>
                <HIcon className="h-4 w-4 text-blue-400" />
                <span style={{ fontSize: '0.875rem' }}>{h.temp}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
