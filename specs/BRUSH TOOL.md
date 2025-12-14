# BRUSH TOOL & INTENT SYSTEM SPEC

## 1\. Unified Intent System

The "Intent" is a shared state property used by both the **Brush** (Grid/Area) and **Pen** (Graph/Edge). It defines the *behavioral rules* for the space or path.

### The Palette

| Color | Intent | Role (Metaphor) |
| :--- | :--- | :--- |
| **Green** | **Harvest** | Resource gathering. Units look for resources in this zone/path. |
| **Red** | **Combat** | **"White Blood Cells."** Patrol and engage threats. High aggression. |
| **Blue** | **Intel** | Scouting, analyzing PoI, uncovering Fog of War. |
| **Yellow** | **Civilian** | **"Red Blood Cells."** Trade, transport, construction, maintenance. |
| **White** | **Focus** | Panic/Muster. Forces all units regardless of class to this zone/path. |

### Color Constants (Reference)

```javascript
const INTENTS = {
    NONE: 0,
    GREEN: 1,
    RED: 2,
    BLUE: 3,
    YELLOW: 4,
    WHITE: 5
};

// Visual Styles (Solid Fills with Alpha)
const PALETTE = {
    [INTENTS.GREEN]:  'rgba(0, 255, 0, 0.25)',
    [INTENTS.RED]:    'rgba(255, 50, 50, 0.25)',
    [INTENTS.BLUE]:   'rgba(50, 50, 255, 0.25)',
    [INTENTS.YELLOW]: 'rgba(255, 215, 0, 0.25)',
    [INTENTS.WHITE]:  'rgba(255, 255, 255, 0.4)'
};
```

-----

## 2\. Brush Tool (Area Painter)

**Role:** Paints intent onto the discrete spatial grid. Used for broad commands (e.g., "Harvest this forest," "Defend this perimeter").

### Inputs

  * **Pointer Down:** Start painting.
  * **Pointer Move:** Paint cells within `brushSize` radius of cursor.
  * **Pointer Up:** Stop painting.
  * **Key Modifiers:** \* `[` / `]`: Decrease/Increase Brush Size.
      * `1-5`: Hotkey Color Selection.

### Data Structure: `IntentGrid`

A lightweight 2D array (or TypedArray) separate from the terrain grid, purely for AI logic.

  * `0`: Empty (Default)
  * `1-5`: Active Intent ID

-----

## 3\. Pen Tool (Updates)

**Role:** Creates connections (Edges) between Nodes/Buildings.
**Update:** The Pen now assigns the `activeIntent` color to the *Edge* upon creation.

### Logic Updates

  * **Old Behavior:** Edges were generic/colorless.
  * **New Behavior:** \* Edges store `intent: INTENT_ID`.
      * Render stroke color matches `PALETTE[intent]`.

-----

## 4\. Implementation Steps

1.  **State:** Add `activeIntent` to your global Input/Tool Manager.
2.  **UI:** Add a color selection tool to the Tool tray and Key listeners (`1`-`5`) to toggle `activeIntent`. Remove map relaed hotkeys.
3.  **Grid Data:** Add `intentLayer` to your Grid System (default all 0).
4.  **Brush:** Implement `paint()` to modify `intentLayer`.
5.  **Render:** Add a pass to draw colored squares over non-zero `intentLayer` cells.
6.  **Pen:** Modify `addEdge` to accept and store the current Color.