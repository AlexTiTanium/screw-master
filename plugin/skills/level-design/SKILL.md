---
name: Level Design
description: This skill should be used when the user asks to "create a level", "design a puzzle", "add parts to level", "configure trays", "level JSON format", "difficulty phase", or works with level files in assets/regions/.
version: 1.0.0
---

# Level Design for Screw Master

This skill provides guidance for designing and creating levels in Screw Master.

## Design Philosophy

Levels are **mechanical problems**, not abstract puzzles:
- Learning happens through interaction, not tutorials
- Physics unlocks information, it doesn't solve puzzles
- At least one valid move must exist at start
- No invisible rules

## Difficulty Phases

### Phase 1: Orientation
- **Parts**: 1-2
- **Colors**: 1-2
- **Mechanics**: Basic unscrewing, tray logic
- **Goal**: Teach core interaction

### Phase 2: Constraint Awareness
- **Parts**: 2-3
- **Colors**: 2-3
- **Mechanics**: Tray capacities, planning
- **Goal**: Teach mistake recovery

### Phase 3: Discovery
- **Parts**: 3-4
- **Colors**: 2-3
- **Mechanics**: Hidden screws, sliding, rotation
- **Goal**: Teach exploration

### Phase 4: Commitment
- **Parts**: 4-5
- **Colors**: 3-4
- **Mechanics**: Tray covers, buffer pressure
- **Goal**: Teach foresight

### Phase 5: Mastery
- **Parts**: 5+
- **Colors**: 3-4
- **Mechanics**: Physics + trays + discovery combined
- **Goal**: Reward understanding

## Level JSON Structure

```json
{
  "version": 1,
  "id": "region-01-01",
  "name": "Level Name",
  "parts": [...],
  "trays": [...],
  "bufferCapacity": 5,
  "win": { "type": "allScrewsRemoved" }
}
```

## Coordinate System

Play area: **815 x 860 pixels**, centered at (0, 0)
- X range: -407 to +407
- Y range: -430 to +430
- Positive Y = down

Parts use center-anchor positioning.

## Available Parts

| Part ID | Size (px) | Constraint | Screw Mounts |
|---------|-----------|------------|--------------|
| `board-walnut-square` | 270x260 | friction | 4 |
| `board-birch-square` | 270x260 | friction | 4 |
| `board-mahogany-square` | 270x260 | friction | 4 |
| `board-oak-vertical` | 270x417 | friction | 4 |
| `board-oak-horizontal` | 501x317 | friction | 4 |
| `board-pine-horizontal` | 501x317 | friction | 4 |
| `simple-plate` | 200x100 | static | 4 |
| `sliding-cover` | 150x80 | slider | 3 |

## Part Definition

```json
{
  "partId": "board-walnut-square",
  "position": { "x": 0, "y": 0 },
  "layer": 1,
  "rotation": 0,
  "screws": [
    { "position": { "x": 50, "y": 50 }, "color": "red" },
    { "position": { "x": 220, "y": 50 }, "color": "blue" }
  ]
}
```

### Screw Positioning

- Positions are **LOCAL** to part origin
- Screw radius: 40px
- Must fit within part collision bounds
- Colors: `"red"`, `"blue"`, `"green"`, `"yellow"`

## Tray Configuration

Exactly 4 trays required:

```json
"trays": [
  { "color": "red", "capacity": 3 },
  { "color": "blue", "capacity": 3 },
  { "color": "green", "capacity": 2 },
  { "color": "yellow", "capacity": 2 }
]
```

- Index 0-1: Visible at start
- Index 2-3: Hidden, revealed as visible fill
- Capacity: 1-4 each
- Buffer tray: 5 screws default (any color)

## Win Conditions

### All Screws Removed (Most Common)
```json
{ "type": "allScrewsRemoved" }
```

### Specific Parts Removed
```json
{ "type": "partsRemoved", "partIndices": [0, 2] }
```

### Target Part Freed
```json
{ "type": "targetFreed", "targetPartIndex": 1 }
```

## Constraint Types

### Static
Part cannot move.
```json
{ "type": "static" }
```

### Friction
Requires screw threshold before movement.
```json
{ "type": "friction", "screwThreshold": 2 }
```

### Slider
Linear motion along axis.
```json
{ "type": "slider", "axis": "x", "min": -50, "max": 50 }
```

### Hinge
Rotation around pivot.
```json
{ "type": "hinge", "pivot": { "x": 0, "y": 0 }, "minAngle": 0, "maxAngle": 90 }
```

### Spring
Snap animation on release.
```json
{ "type": "spring", "direction": "open", "duration": 300 }
```

## Validation Checklist

Before saving a level:

- [ ] All `partId` values exist in registry
- [ ] All parts fit within play area bounds
- [ ] All screws within part collision bounds (40px from edge)
- [ ] Exactly 4 trays configured
- [ ] Tray capacities are 1-4
- [ ] Win condition references valid indices
- [ ] At least one valid move at start
- [ ] Layer values unique (warning if not)

## Position Calculation

To convert Figma positions to PixiJS (center-anchor):

```
pixiX = figmaLeft + (width / 2)
pixiY = figmaTop + (height / 2)
```

Example: 56x70px screw at Figma (229, 493):
- PixiJS X = 229 + 28 = 257
- PixiJS Y = 493 + 35 = 528

## Reference Files

- Level format spec: `docs/level-format.md`
- Level design guide: `docs/level-design.md`
- Part definitions: `src/shared/parts/definitions/`
- Type definitions: `src/shared/types/level.types.ts`
- Example levels: `assets/regions/region-test.json`
- Validation tests: `tests/unit/shared/levels/`
