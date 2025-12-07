# SPEC: The Fluid Economy

## 1. High Concept: "Hydraulics, not Spreadsheets"

The economy is not a global table of numbers. It is a simulation of **Local Pressure**.

  * **Resources = Fluid.** They flow from High Pressure (Full Stockpiles) to Low Pressure (Empty Markets).
  * **Sprigs = Valves.** They physically move goods to equalize pressure.
  * **Anima = Energy.** Money is not abstract; "Anima" is the literal energy Sprigs burn to move. If the economy creates surplus Anima, the swarm grows. If it runs out, the swarm halts.

## 2. The Resources (Commodity Money)

There is no "Gold." All trading is bartering, valued against **Anima**.

### Primary Resources

1.  **Anima (The Fuel/Currency):**
      * **Usage:** Spawns Sprigs, powers buildings, fuels movement.
      * **Source:** Refined from raw materials or harvested from magical nodes.
      * **Role:** The "Universal Solvent." Goods are priced in Anima.
2.  **Food (The Tension):**
      * **Usage:** Consumed by Pops (Settlers).
      * **Tension:** If Food hits 0, Pops leave/die (Game Over condition).
      * **Market Dynamic:** Demand is constant and inelastic (people *need* to eat).
3.  **Materials (Wood/Stone/Ore):**
      * **Usage:** Construction and Crafting.
      * **Market Dynamic:** Demand is bursty (high during building projects, low otherwise).

## 3. The Market Mechanism: "Local Scarcity"

Prices are calculated per-building, not globally.

  * **The "Tank" Logic:** Every building has an `Inventory` and a `Capacity`.
  * **The Formula (Scarcity):**
    $$Price = BasePrice \times (1 + (\text{Emptiness}^2 \times \text{DesperationFactor}))$$
      * *Example:* A Bakery with 0/100 Wheat pays **10x** normal price. A Bakery with 90/100 Wheat pays **0.1x**.

### "Slime Rancher" Saturation

To prevent players from automating just one crop:

  * **The Crash:** If a specific resource is sold repeatedly to the same node within a short window, the `DesperationFactor` drops temporarily.
  * **Effect:** The player must rotate crops or find new markets (expand the map) to keep profits high.

## 4. The Trader AI (Utility Scorer)

Sprigs do not "think." They follow the path of least resistance towards highest reward.

### The Algorithm (Run on "Idle" Sprigs)

1.  **Scan:** Look at the `GlobalOrderBook` (a sorted list of Buy/Sell orders).
2.  **Score:**
    $$Score = \frac{(\text{BuyPrice}_{target} - \text{SellPrice}_{source}) - \text{AnimaCost}_{travel}}{\text{Distance}}$$
3.  **Action:**
      * If `Score > Threshold`: **Execute Trade.**
      * If `Score < Threshold`: **Idle / Sleep.**
      * *Result:* Sprigs naturally ignore low-margin trades until they are "bored" (nothing better to do), or until the price spikes high enough to make the travel worth it.

## 5. Visual Feedback (Accessibility First)

Since the player cannot hear "coins clinking," visuals must communicate economic health.

  * **Stockpiles (Physicality):**
      * Empty = Dirt patch.
      * Full = Overflowing crates.
      * *Goal:* Player can assess supply levels at a glance without reading numbers.
  * **Transactions (Floating Text):**
      * **Big Profit:** Large, bouncing text `+50 Anima` (Green/Gold).
      * **Market Crash/Loss:** Small, drooping text `-2` (Red/Grey).
  * **Price Tickers:**
      * Buildings desperate for goods pulse/throb or emit a "Hungry" icon.

## 6. Technical Implementation (DOD / Performance)

To simulate this for 500+ entities without lag:

### A. The "Slow Tick"

  * **Physics Loop:** 60 Hz.
  * **Economy Loop:** 1 Hz (Once per second).
      * Updates prices based on current inventory.
      * Sorts the `OrderBook`.
      * *Why?* Prices don't need to change every millisecond.

### B. The Order Book (Structure of Arrays)

Do not have Sprigs loop through buildings. Have buildings register to a central array.

```typescript
// The "Marketplace" in memory
const Market = {
    buyOrders: [
        { buildingId: 10, resource: 'WOOD', price: 50 },
        { buildingId: 4,  resource: 'WOOD', price: 12 },
        // ... sorted by Price High->Low
    ],
    sellOrders: [
        { buildingId: 2,  resource: 'WOOD', price: 5 },
        // ... sorted by Price Low->High
    ]
}
```

  * **Logic:** A Sprig just looks at `Market.buyOrders[0]` and `Market.sellOrders[0]`. If `Buy > Sell`, a trade exists. O(1) complexity.