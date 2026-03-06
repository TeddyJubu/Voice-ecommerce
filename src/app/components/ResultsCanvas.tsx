import { InfoCard } from "./cards/InfoCard";
import { WebResultsList } from "./cards/WebResultsList";
import { ProductShowcase } from "./cards/ProductShowcase";
import { ComparisonTable } from "./cards/ComparisonTable";
import { WeatherPanel } from "./cards/WeatherPanel";
import { MapPlacesList } from "./cards/MapPlacesList";
import { NewsBrief } from "./cards/NewsBrief";
import { HowToSteps } from "./cards/HowToSteps";
import { StockCryptoQuote } from "./cards/StockCryptoQuote";
import { ActionBar } from "./cards/ActionBar";
import type { UIBlock } from "./mockScenarios";

const componentMap: Record<string, React.ComponentType<any>> = {
  InfoCard,
  WebResultsList,
  ProductShowcase,
  ComparisonTable,
  WeatherPanel,
  MapPlacesList,
  NewsBrief,
  HowToSteps,
  StockCryptoQuote,
  ActionBar,
};

interface ResultsCanvasProps {
  blocks: UIBlock[];
  onAction?: (action: { label: string; query?: string }) => void;
}

export function ResultsCanvas({ blocks, onAction }: ResultsCanvasProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const Component = componentMap[block.type];
        if (!Component) {
          return (
            <InfoCard
              key={i}
              title="Unknown Component"
              body={`Component type "${block.type}" is not in the registry.`}
            />
          );
        }
        const props =
          block.type === "ActionBar"
            ? { ...block.props, onAction }
            : block.props;
        return <Component key={i} {...props} />;
      })}
    </div>
  );
}
