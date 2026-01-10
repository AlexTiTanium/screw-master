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
  position: { x: number; y: number };  // Local position (centered coordinate system)
  layer: number;                 // Z-order (higher = on top)
  rotation?: number;             // Initial rotation in degrees (default: 0)
  screws: ScrewPlacement[];      // Screws attached to this part
}
```

**Position uses a centered coordinate system** - see [Play Area Coordinate System](#play-area-coordinate-system) below.

### Screw Placement

Places a screw at a specific position on the part:

```typescript
interface ScrewPlacement {
  position: Position;            // Position relative to part origin (local coords)
  color: ScrewColor;             // Screw color (determines tray destination)
}
```

**Position Constraints:**
- Position is in local coordinates (relative to part's origin at 0,0)
- The screw's full circle must be within the part's collision bounds
- Screw radius is 40 pixels - for a 200x200 box, valid x/y range is [40, 160]

**Example:**
```json
{
  "partId": "board-walnut-square",
  "position": { "x": -140, "y": 170 },
  "layer": 1,
  "screws": [
    { "position": { "x": 50, "y": 50 }, "color": "red" },
    { "position": { "x": 220, "y": 50 }, "color": "blue" },
    { "position": { "x": 135, "y": 130 }, "color": "green" }
  ]
}
```

Note: Part position uses centered coordinates (x=-140, y=170 means 140px left of center, 170px below center).

### Tray Configuration

Configures the 4 colored trays. **Array order determines display order:**
- Index 0-1: Initially visible trays (left to right)
- Index 2-3: Hidden trays (revealed when visible trays complete)

When a visible tray is full:
1. Full tray slides down and hides
2. All remaining visible trays shift left
3. Next hidden tray slides up to reveal

```typescript
interface TrayConfig {
  color: ScrewColor;             // Which color this tray accepts
  capacity: number;              // Max screws (1-4)
}
```

**Example:**
```json
"trays": [
  { "color": "red", "capacity": 3 },     // Visible at position 0 (left)
  { "color": "blue", "capacity": 3 },    // Visible at position 1 (right)
  { "color": "green", "capacity": 2 },   // Hidden, revealed when first tray fills
  { "color": "yellow", "capacity": 2 }   // Hidden, revealed when second tray fills
]
```

### Win Conditions

```typescript
type WinCondition =
  | { type: 'allScrewsRemoved' }                           // Remove every screw
  | { type: 'partsRemoved'; partIds: string[] }            // Remove specific parts
  | { type: 'targetFreed'; targetPartInstanceIndex: number }; // Free a specific part
```

---

## 4. Play Area Coordinate System

Parts are positioned using a **centered coordinate system** where `(0, 0)` is the center of the play area.

### Play Area Dimensions

| Property | Value |
|----------|-------|
| Play area size | 815 x 860 pixels |
| X coordinate range | -407 to +407 |
| Y coordinate range | -430 to +430 |

### Coordinate Directions

- **Positive X**: Right of center
- **Negative X**: Left of center
- **Positive Y**: Below center (down)
- **Negative Y**: Above center (up)

### Visual Layout

```
                    -407        0        +407
                      │         │         │
           ┌──────────┼─────────┼─────────┼──────────┐
      -430 ─│         │         │         │         │
           │         │    ↑    │         │         │
           │         │    │    │         │         │
           │    ←────┼────┼────┼────→    │         │
         0 ─│         │    │    │         │         │
           │         │    ↓    │         │         │
           │         │         │         │         │
      +430 ─│         │         │         │         │
           └──────────┴─────────┴─────────┴──────────┘
                    Play Area (815 x 860)
```

### Part Boundary Validation

Parts must fit **entirely within** the play area. The validation considers the part's collision box dimensions:

```
Valid position range for a part with size (width, height):
  minX = -407 + width/2
  maxX = +407 - width/2
  minY = -430 + height/2
  maxY = +430 - height/2
```

**Example calculations:**

| Part | Size | Valid X Range | Valid Y Range |
|------|------|---------------|---------------|
| board-walnut-square | 270x260 | [-272, 272] | [-300, 300] |
| board-pine-horizontal | 501x317 | [-156, 156] | [-271, 271] |

### Unit Tests

Play area boundaries are enforced by unit tests in `tests/unit/shared/levels/playAreaValidation.test.ts`. These tests:

1. Load all region JSON files from `assets/regions/`
2. Validate every part in every level fits within bounds
3. **Fail immediately** if any part exceeds the play area

This ensures level designers cannot accidentally place parts outside the visible play area.

---

## 5. Screw Types and Colors

### Screw Visual States

Screws have two visual representations depending on their state:

| Type | Asset Pattern | When Used |
|------|---------------|-----------|
| **Short screw** | `short-screw-{color}.png` | In puzzle (screwed into boards) |
| **Long screw** | `screw-{color}.png` | After removal (in buffer/tray) |

**Gameplay flow:**
1. Screws start as **short** screws embedded in boards
2. When player taps a screw, it animates to **long** screw (unscrewing)
3. Long screw then moves to buffer tray or colored tray

This visual distinction helps players understand which screws are still attached vs. removed.

### Available Colors

Colors available (string enum for JSON readability):

| Value | Short Asset | Long Asset |
|-------|-------------|------------|
| `"red"` | `short-screw-red.png` | `screw-red.png` |
| `"blue"` | `short-screw-blue.png` | `screw-blue.png` |
| `"green"` | `short-screw-green.png` | `screw-green.png` |
| `"yellow"` | `short-screw-yellow.png` | `screw-yellow.png` |

---

## 6. Part Definitions (TypeScript)

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

## 7. Complete Example

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
      "position": { "x": 0, "y": 100 },
      "layer": 0,
      "screws": [
        { "position": { "x": 270, "y": 480 }, "color": "blue" }
      ]
    },
    {
      "partId": "sliding-cover",
      "position": { "x": 0, "y": -50 },
      "layer": 1,
      "screws": [
        { "position": { "x": 65, "y": 40 }, "color": "red" },
        { "position": { "x": 85, "y": 40 }, "color": "red" }
      ]
    }
  ],
  "trays": [
    { "color": "red", "capacity": 4 },
    { "color": "blue", "capacity": 2 },
    { "color": "green", "capacity": 2 },
    { "color": "yellow", "capacity": 2 }
  ],
  "win": { "type": "allScrewsRemoved" }
}
```

Note: Part positions use centered coordinates where (0, 0) is the center of the play area.

---

## 8. Validation Rules

The level loader validates:

1. **Part references** - Every `partId` must match a registered `PartDefinition`
2. **Play area bounds** - Every part must fit entirely within the 815x860 play area (see section 4)
3. **Screw bounds** - Every screw position must be within the part's collision bounds (accounting for screw radius of 40px)
4. **Tray count** - Exactly 4 trays required
5. **Tray capacity** - Must be 1-4
6. **Layer uniqueness** - Warning if multiple parts share the same layer (occlusion ambiguity)

---

## 9. File Organization

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
