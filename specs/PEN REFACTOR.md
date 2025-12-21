# SPEC: STICKY ROADS & BUILDING SNAPPING (PEN TOOL REFACTOR)

## 1\. Goal

Transition the **Pen Tool** from general "Flow Field" painting to a high-precision **Logistics Artery** system. The goal is to eliminate "shooting out" behavior at corners and enable strict lane-following for logistics sprigs (Chests).

## 2\. The "Hooking" Logic (Building Snapping)

The Pen Tool will now proactively "hook" onto structural nodes (Castle, Berry Bushes) during the drawing phase.

### Input logic (onUp):

  * **Raycast for Targets**: On `pointerUp`, check if the cursor is within a snap radius of an existing `BUILDING` or `RESOURCE` node.
  * **Snap to Center**: If a target is found, force the edge's endpoint to the target's center coordinates.
  * **Waypoint Fallback**: If no building is hit, create a standard `WAYPOINT` node as the anchor.

## 3\. The "Sticky Road" Data Structure

Edges now store the physical roadway points to ensure units stay "on the street".

  * **Edge Points**: Instead of baking vectors into the global grid, the `GraphEdge` stores a list of smoothed coordinates representing the road.
  * **Baking**: Use the `Pathfinder` to generate a high-density polyline between `NodeA` and `NodeB`.

## 4\. Visual Assets & Roles

The refactored system supports the following mascot identities for the **Metabolic Test Room**:

| Asset | Mascot Visual | Role |
| :--- | :--- | :--- |
| **Home Base** | **Brown Castle** | The "Heart." Acts as a `ResourceSink` that drains energy over time. |
| **Food Source** | **Green Berry Bush** | Source of Pink Circles (Berries). Snap target for logistics. |
| **Cabbage** | **Green Circle** | **Harvesting specialist.** Automatically seeks Berries in Green Brush zones. |
| **Chest** | **Yellow Square** | **Logistics specialist.** Strictly follows "Sticky Roads" to transport Berries. |
| **Ingot** | **Red Cross (45°)** | **Defense specialist.** Patrols the Heart and Roads to engage Germs. |
| **Germ** | **Grey Circle (Red Eyes)** | **The Infection.** Seeks out and attacks the Castle Heart. |

## 5\. Technical Implementation (Minimal Pseudo)

### Pen Tool Snapping:

```typescript
// On Pointer Up
const target = GraphSystem.getNodeAt(x, y); 
if (target && target.type !== 'WAYPOINT') {
    // Snap edge to building center
    GraphSystem.createLink(lastNodeId, target.id, currentIntent);
} else {
    // Standard waypoint creation
    const newNode = GraphSystem.addNode(x, y, 'WAYPOINT');
    GraphSystem.createLink(lastNodeId, newNode.id, currentIntent);
}
```

### Road Following (SprigSystem):

  * **Commute Mode**: If a **Chest (Yellow)** is on a road, it ignores the broad flow field and strictly lerps between the `edge.points`.
  * **Handshake**: Chests automatically scan for **Pink Circles** near road endpoints to begin their transport loop.