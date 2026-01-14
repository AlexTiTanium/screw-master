---
description: Generate level JSON from natural language description for Screw Master
allowed-tools: ["Read", "Write", "Glob", "Grep", "AskUserQuestion", "TodoWrite"]
argument-hint: "<puzzle description> or interactive"
---

# Level Creation

Generate valid level JSON from a puzzle concept description.

## Process

1. **Gather puzzle concept**
   If no description provided, ask the user:
   - What's the puzzle concept? (parts, mechanics, challenge)
   - What difficulty phase? (Orientation, Constraint Awareness, Discovery, Commitment, Mastery)
   - How many colors needed?
   - Any specific parts to use?

2. **Determine difficulty phase**
   Read `docs/level-design.md` for phase characteristics:

   | Phase | Colors | Parts | Mechanics |
   |-------|--------|-------|-----------|
   | Orientation | 1-2 | 1-2 | Basic unscrewing |
   | Constraint Awareness | 2-3 | 2-3 | Tray capacity planning |
   | Discovery | 2-3 | 3-4 | Hidden screws, sliding |
   | Commitment | 3-4 | 4-5 | Tray covers, buffer pressure |
   | Mastery | 3-4 | 5+ | Physics + trays + discovery |

3. **Select parts**
   Read part definitions from `src/shared/parts/definitions/` to get available parts:

   **Boards (static/friction)**:
   - `board-walnut-square` (270x260px)
   - `board-birch-square` (270x260px)
   - `board-mahogany-square` (270x260px)
   - `board-oak-vertical` (270x417px)
   - `board-oak-horizontal` (501x317px)
   - `board-pine-horizontal` (501x317px)

   **Dynamic parts**:
   - `simple-plate` (200x100px, static)
   - `sliding-cover` (150x80px, slider)

4. **Calculate positions**
   Play area: 815 x 860 pixels, centered at (0, 0)
   - X range: -407 to +407
   - Y range: -430 to +430
   - Parts must fit entirely within bounds
   - Account for part dimensions when positioning

5. **Place screws**
   - Screw positions are relative to part origin (local coordinates)
   - Screw radius is 40px - must be within part collision bounds
   - Colors: "red", "blue", "green", "yellow"

6. **Configure trays**
   - Exactly 4 trays required
   - Index 0-1: Visible at start
   - Index 2-3: Hidden, revealed as visible trays fill
   - Capacity: 1-4 screws each
   - Buffer tray: 5 screws default (any color)

7. **Set win condition**
   Options:
   - `{ "type": "allScrewsRemoved" }` - Remove all screws
   - `{ "type": "partsRemoved", "partIndices": [0, 2] }` - Remove specific parts
   - `{ "type": "targetFreed", "targetPartIndex": 1 }` - Free a specific part

8. **Generate and validate JSON**

## Level JSON Structure

```json
{
  "version": 1,
  "id": "region-level-number",
  "name": "Level Display Name",
  "parts": [
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
  ],
  "trays": [
    { "color": "red", "capacity": 3 },
    { "color": "blue", "capacity": 3 },
    { "color": "green", "capacity": 2 },
    { "color": "yellow", "capacity": 2 }
  ],
  "win": { "type": "allScrewsRemoved" }
}
```

## Validation Rules

Before writing the level, verify:
1. All `partId` values exist in the part registry
2. All parts fit within play area (815x860, centered)
3. All screws within part collision bounds (40px radius from edge)
4. Exactly 4 trays configured
5. Tray capacities are 1-4
6. Win condition references valid part indices (if applicable)
7. At least one valid move exists at start

## Output Options

Ask user where to save:
1. Add to existing region file (`assets/regions/region-{n}.json`)
2. Create as test level (`assets/regions/region-test.json`)
3. Output JSON only (for manual placement)

## Reference Files

- Level design guide: `docs/level-design.md`
- Level format spec: `docs/level-format.md`
- Part definitions: `src/shared/parts/definitions/`
- Type definitions: `src/shared/types/level.types.ts`
- Example levels: `assets/regions/region-test.json`
