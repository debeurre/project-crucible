## **THREATS AND COMBAT - BASICS**
We are building up the combat system in waves, starting from primitives and scaffolding.

### **Wave 1: The Combat Body (Data & Stats)**

**Goal:** Entities can sustain damage, gain XP, and have "Class" differentiations.
**Focus:** Pure Data & Physics. No complex behaviors yet.
* **Deliverable:** A console command `debug_hit(id1, id2)` that logs damage and XP gain.

### **Wave 2: The Thief (AI & Spawning)**

**Goal:** A "Pest" that creates economic pressure without combat micro.
**Focus:** Stealthy Spawning & Steal-Flee Loop.
* **Deliverable:** A Thief spawns in a quiet corner, runs in, steals a cookie, and escapes.

### **Wave 3: The Response (Patrols & Retreat)**

**Goal:** Automating defense and preserving life.
**Focus:** Signals & Self-Preservation.
* **Deliverable:** You place a flag. A Sprig guards it. A Thief appears. The Guard intercepts. The Thief drops the food and dies.

### **Wave 4: Evolution (The Layered Pro)**

**Goal:** Sprigs differentiate based on history.
**Focus:** XP Hooks & visual tinting.
* **Deliverable:** A "Veteran" Hauler moves visibly faster and carries more than a "Rookie."

### **Wave 5: Spectacle (Visual Feedback)**

**Goal:** Making the simulation readable and "Juicy."
**Focus:** Particles, Icons, and Text.
* **Deliverable:** Combat feels punchy. You can see exactly when a Sprig levels up or panics without clicking them.

