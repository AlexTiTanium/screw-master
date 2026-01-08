# Screw Master - Level Format Specification

*Technical reference for level and region file formats*

## 1. Overview

Screw Master uses a **two-layer system** for level data:

| Layer | Format | Contains | Location |
|-------|--------|----------|----------|
| **Part Definitions** | TypeScript | Shapes, physics, materials, screw mount points | `src/shared/parts/` |
| **Level Data** | JSON | Part placement, screw colors, tray config | `assets/regions/` |

**Why this split?**
- Parts define *what* something is (constant across all uses)
- Levels define *where* things are and *how* they're configured (varies per puzzle)
- Eliminates redundancy - shape data isn't repeated in every level
- Type safety - TypeScript catches invalid part references at build time

---

## 2. Region Structure

A **region** is a collection of 10 levels stored in a single JSON file.

**File location:** `assets/regions/region-{n}.json`

```typescript
interface RegionDefinition {
  version: 1;                    // Format version for migrations
  id: string;                    // Unique region identifier (e.g., "workshop")
  name: string;                  // Display name (e.g., "The Workshop")
  levels: LevelDefinition[];     // Exactly 10 levels
}
```

**Example:**
```json
{
  "version": 1,
  "id": "workshop",
  "name": "The Workshop",
  "levels": [
    { "version": 1, "id": "workshop-01", "name": "First Steps", ... },
    { "version": 1, "id": "workshop-02", "name": "Two Colors", ... }
  ]
}
```

---

## 3. Level Definition

Each level describes the puzzle configuration:

```typescript
interface LevelDefinition {
  version: 1;                    // Level format version
  id: string;                    // Unique level ID within region
  name: string;                  // Display name
  parts: PartInstance[];         // Placed parts with screws
  trays: [TrayConfig, TrayConfig, TrayConfig, TrayConfig];  // Exactly 4 trays
  bufferCapacity?: number;       // Buffer tray capacity (default: 5)
  win: WinCondition;             // Victory condition
}
```

### Part Instance

Places a predefined part in the level:

```typescript
interface PartInstance {
  partId: string;                // References a PartDefinition.id
  position: { x: number; y: number };  // World position
  layer: number;                 // Z-order (higher = on top)
  rotation?: number;             // Initial rotation in degrees (default: 0)
  screws: ScrewPlacement[];      // Screws attached to this part
}
```

### Screw Placement

Assigns a screw to a mount point on the part:

```typescript
interface ScrewPlacement {
  mountId: string;               // References ScrewMountDef.id from PartDefinition
  color: ScrewColor;             // Screw color (determines tray destination)
}
```

### Tray Configuration

Configures the 4 colored trays:

```typescript
interface TrayConfig {
  color: ScrewColor;             // Which color this tray accepts
  capacity: number;              // Max screws (1-4)
  hidden: boolean;               // Under the cover initially?
}
```

### Win Conditions

```typescript
type WinCondition =
  | { type: 'allScrewsRemoved' }                           // Remove every screw
  | { type: 'partsRemoved'; partIds: string[] }            // Remove specific parts
  | { type: 'targetFreed'; targetPartInstanceIndex: number }; // Free a specific part
```

---

## 4. Screw Colors

Available colors (string enum for JSON readability):

| Value | Description |
|-------|-------------|
| `"red"` | Red screw |
| `"blue"` | Blue screw |
| `"green"` | Green screw |
| `"yellow"` | Yellow screw |
| `"purple"` | Purple screw |
| `"orange"` | Orange screw |

---

## 5. Part Definitions (TypeScript)

Parts are defined in TypeScript code, not JSON. Each part specifies properties that are constant for all instances.

```typescript
interface PartDefinition {
  id: string;                    // Unique identifier (e.g., "simple-plate")
  name: string;                  // Display name for debugging
  asset: string | null;          // Sprite path or null for procedural
  collision: CollisionShape;     // Physics bounds
  material: MaterialType;        // Visual material
  constraint: ConstraintDef;     // Physics behavior
  screwMounts: ScrewMountDef[];  // Where screws can attach
  pivot?: Position;              // Optional custom pivot point
}
```

### Collision Shapes

```typescript
type CollisionShape =
  | { type: 'box'; width: number; height: number }
  | { type: 'polygon'; points: Position[] };
```

### Materials

| Value | Description |
|-------|-------------|
| `"metal"` | Metallic surface |
| `"wood"` | Wooden surface |
| `"plastic"` | Plastic surface |
| `"rubber"` | Rubber/soft surface |
| `"glass"` | Transparent glass |

### Constraint Types

Parts can have one of these physics behaviors:

#### Static
Part cannot move at all.
```typescript
{ type: 'static' }
```

#### Slider
Linear motion along an axis.
```typescript
{
  type: 'slider',
  axis: 'x' | 'y',      // Movement direction
  min: number,          // Minimum travel (pixels)
  max: number           // Maximum travel (pixels)
}
```

#### Hinge
Rotation around a pivot point.
```typescript
{
  type: 'hinge',
  pivot: { x: number, y: number },  // Pivot relative to part origin
  minAngle: number,                  // Minimum angle (degrees)
  maxAngle: number                   // Maximum angle (degrees)
}
```

#### Spring
Tension release animation.
```typescript
{
  type: 'spring',
  direction: 'open' | 'closed',  // Where it snaps to
  duration: number               // Animation duration (ms)
}
```

#### Friction
Resistance until screw threshold is met.
```typescript
{
  type: 'friction',
  screwThreshold: number         // Screws to remove before movement
}
```

### Screw Mount Points

Define where screws can attach on a part:

```typescript
interface ScrewMountDef {
  id: string;                    // Unique ID within part (e.g., "top-left")
  localPosition: { x: number; y: number };  // Position relative to part origin
}
```

---

## 6. Complete Example

### Part Definition (TypeScript)

```typescript
// src/shared/parts/definitions/sliding-cover.ts
import { registerPart } from '../registry';
import type { PartDefinition } from '@shared/types';

export const slidingCover: PartDefinition = {
  id: 'sliding-cover',
  name: 'Sliding Cover',
  asset: 'images/parts/sliding-cover.png',
  collision: { type: 'box', width: 150, height: 80 },
  material: 'metal',
  constraint: {
    type: 'slider',
    axis: 'x',
    min: 0,
    max: 100,
  },
  screwMounts: [
    { id: 'left', localPosition: { x: 25, y: 40 } },
    { id: 'right', localPosition: { x: 125, y: 40 } },
  ],
};

registerPart(slidingCover);
```

### Level JSON

```json
{
  "version": 1,
  "id": "workshop-03",
  "name": "Hidden Treasure",
  "parts": [
    {
      "partId": "base-plate",
      "position": { "x": 540, "y": 960 },
      "layer": 0,
      "screws": [
        { "mountId": "center", "color": "blue" }
      ]
    },
    {
      "partId": "sliding-cover",
      "position": { "x": 540, "y": 910 },
      "layer": 1,
      "screws": [
        { "mountId": "left", "color": "red" },
        { "mountId": "right", "color": "red" }
      ]
    }
  ],
  "trays": [
    { "color": "red", "capacity": 4, "hidden": false },
    { "color": "blue", "capacity": 2, "hidden": false },
    { "color": "green", "capacity": 2, "hidden": true },
    { "color": "yellow", "capacity": 2, "hidden": true }
  ],
  "win": { "type": "allScrewsRemoved" }
}
```

---

## 7. Validation Rules

The level loader validates:

1. **Part references** - Every `partId` must match a registered `PartDefinition`
2. **Mount references** - Every `mountId` must exist in the part's `screwMounts`
3. **Tray count** - Exactly 4 trays required
4. **Tray capacity** - Must be 1-4
5. **Layer uniqueness** - Warning if multiple parts share the same layer (occlusion ambiguity)

---

## 8. File Organization

```
src/shared/
├── types/
│   ├── parts.types.ts     # PartDefinition, ScrewColor, ConstraintDef
│   └── level.types.ts     # LevelDefinition, RegionDefinition
├── parts/
│   ├── registry.ts        # Part registration and lookup
│   └── definitions/       # Individual part files
│       ├── index.ts       # Barrel export (auto-registers all parts)
│       ├── simple-plate.ts
│       └── sliding-cover.ts
└── levels/
    └── loader.ts          # Region loading and validation

assets/regions/
├── region-1.json          # Levels 1-10
├── region-2.json          # Levels 11-20
└── ...
```
