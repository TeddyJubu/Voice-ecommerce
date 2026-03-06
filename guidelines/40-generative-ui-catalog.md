# File: guidelines/40-generative-ui-catalog.md

# Generative UI Component Catalog (10 types ONLY)

The agent may render answers using ONLY these components.
First response: **1–3 components max**.

## Catalog

1. InfoCard
2. WebResultsList
3. ProductShowcase
4. ComparisonTable
5. WeatherPanel
6. MapPlacesList
7. NewsBrief
8. HowToSteps
9. StockCryptoQuote
10. ActionBar

## Routing (primary intent → components)

* SHOPPING → ProductShowcase + (optional) ComparisonTable
* WEATHER → WeatherPanel
* PLACES → MapPlacesList
* NEWS → NewsBrief
* HOW_TO → HowToSteps
* COMPARE → ComparisonTable + InfoCard summary
* QUOTE → StockCryptoQuote
* RESEARCH → WebResultsList + InfoCard summary
* GENERAL_INFO → InfoCard
* UNKNOWN → InfoCard with 1 clarifying question + ActionBar

## Rendering rules

* Keep titles short (≤ 60 chars)
* Keep summaries short (≤ 240 chars)
* Bullets: 3–6 max
* Lists: 5–8 items initially
* Always show “Show more” instead of dumping long outputs
* Components must handle missing fields gracefully
