# Screw Master - Game Design Document

## 1. High-Level Vision

A tactile, physics-enhanced puzzle game about dismantling complex objects by unscrewing bolts in the correct order, managing limited colored trays, and physically interacting with parts to reveal hidden connections.

The game blends:
- **Logical planning** (order of operations, color constraints)
- **Spatial reasoning** (layers, occlusion)
- **Light physics interaction** (pulling, sliding, tension, friction)

Into a calm but mentally engaging experience.

**Core Fantasy:**
> "I am carefully taking apart a real object with my hands."

---

## 2. Core Pillars

### 2.1 Tactile Interaction
- Everything feels physical: weight, resistance, friction
- Screws rotate out, parts shift, covers slide
- Single tap to unscrew (accessible, quick feedback)

### 2.2 Readable Strategy
- No numbers-heavy UI
- Progress shown visually (stacked screws in trays, part states)
- Clear cause and effect

### 2.3 Controlled Complexity
- Few rules, many emergent situations
- Difficulty from system interactions, not obscure rules

### 2.4 Physics as Discovery, Not Chaos
- Physics is constrained and intentional
- Used to reveal information, not simulate destruction
- **Must be deterministic and E2E testable**

---

## 3. Screen Layout

**Resolution:** 1080x1920 (portrait, 9:16 aspect ratio)

```
┌───────────────────────────┐
│ [Tray 1] [Tray 2] [Cover] │  <- Colored Trays (4 total, 2 hidden)
├───────────────────────────┤
│   [ Buffer Tray (5) ]     │  <- Temporary storage
├───────────────────────────┤
│                           │
│                           │
│                           │
│     ┌─────────────┐       │
│     │             │       │
│     │   PUZZLE    │       │
│     │   OBJECT    │       │  <- Main puzzle object (center)
│     │             │       │
│     └─────────────┘       │
│                           │
│                           │
│                           │
│                           │
│                           │
│                           │
│                           │
└───────────────────────────┘
```

---

## 4. Camera & Perspective

### 4.1 Fixed Top-Down Camera
- Camera locked to **orthographic top-down (90°)**
- No tilt, no fake depth, no perspective distortion
- Z-ordering handled strictly by logical layers, not visual perspective

### 4.2 Why Not Isometric

Isometric creates problems for this game:
- Rotating parts visually overlap in misleading ways
- Depth perception becomes ambiguous when parts move
- Hidden screws may appear reachable when they are not
- Physics interactions become visually "dishonest"

**The Trust Principle:**
> If something looks reachable, it is reachable.
> If something looks blocked, it is blocked.

---

## 5. Core Gameplay Loop

1. Player observes the puzzle object
2. Player identifies available screws (not occluded, not blocked)
3. Player **taps** a screw to remove it
4. Screw **automatically places** into:
   - Matching visible colored tray (if space available), OR
   - Buffer tray (if no matching tray visible or matching tray full)
5. Removing screws loosens or frees parts
6. Freed parts move, slide, or fall (within constraints)
7. New screws or interactions are revealed
8. **Auto-transfer**: When a colored tray gains space, matching screws move from buffer automatically
9. Loop continues until win condition is met

---

## 6. Core Rules (MVP)

### 6.1 Screws

Each screw has:
- **Color** - determines which tray accepts it
- **Position** - screen coordinates
- **Layer** - 2D depth for occlusion (draw order)

A screw can be removed only if:
1. It is not occluded by another part (higher layer blocking it)
2. There is space in a matching visible tray OR the buffer tray
3. It is not physically blocked by constrained parts

### 6.2 Colored Trays (Primary Constraint System)

**Layout:**
- 4 trays total at top of screen
- 2 leftmost trays **visible** at start
- 2 rightmost trays **hidden** under a cover

**Properties:**
- Each tray accepts only **one color**
- Variable capacity: **1-4 screws** per tray
- Capacity shown by **stacked screws** (implicit from tray size)

**States:**
- **Open**: Can accept matching screws
- **Full/Locked**: Cannot accept more screws

**Tray Cover:**
- Player can interact to **open** the cover
- Opening reveals the 2 hidden trays
- Changes available strategies mid-puzzle

### 6.3 Buffer Tray (Temporary Storage)

- Located directly **under** colored trays
- Capacity: **5 screws** maximum
- Accepts **any color**
- Screws here do NOT contribute to completion
- **Auto-transfer**: When a matching colored tray has space, screws automatically move from buffer
- If buffer is full → player cannot remove more screws (soft lock)

### 6.4 Parts

Structural elements held in place by screws.

**Part States:**
| State | Description |
|-------|-------------|
| **Static** | Fully fixed, cannot move |
| **Constrained** | Moves within limits (hinge, slider) |
| **Free** | All screws removed, affected by gravity |

**Movement Rules:**

Parts may:
- **Translate** (slide within limits)
- **Rotate** (around defined pivots)
- **Settle** due to gravity when freed

Parts may NOT:
- Overlap illegally
- Rotate freely unless designed to
- Leave puzzle bounds

**Movement is always:** limited, intentional, reversible.

**Free parts:**
- Move according to physics constraints
- May reveal hidden screws
- May block/unblock other interactions

### 6.5 Gravity System

**Direction:**
- Gravity pulls toward **screen bottom** (toward player)
- Simulates table tilted slightly toward player
- Consistent across all puzzles

**Behavior:**
- **Constrained parts**: Gravity has no effect until freed
- **Free parts**: Auto-settle toward screen bottom
- **Settled parts**: Come to rest, can still be manipulated

### 6.6 Win & Failure

**Win Condition:**
- All required parts removed, OR
- Core object fully dismantled (level-specific)

**Soft Failure:**
- No legal moves available (buffer full, no valid screws)
- Player must restart level
- **No undo in MVP** (intentional design choice)

---

## 7. Physics System

### 7.1 Requirements
- **Deterministic**: Same inputs always produce same outputs
- **E2E Testable**: Can be controlled and verified in automated tests
- **Bounded**: No chaotic outcomes, always readable

### 7.2 Implementation: Custom Constrained Physics

Using predefined joint types and motion limits (NOT a full physics engine like Matter.js).

**Why custom:**
- Full determinism guaranteed
- Complete control over test harness
- Predictable, "guided" movement
- Simpler debugging

### 7.3 Supported Constraints

| Type | Behavior | Example |
|------|----------|---------|
| **Slider** | Linear motion along axis | Panel slides left/right |
| **Hinge** | Rotation around pivot point | Flap opens 90 degrees |
| **Spring** | Tension that releases | Cover snaps open when unlocked |
| **Friction** | Resistance until threshold | Part won't move until 2+ screws removed |

### 7.4 Physics-Driven Interactions

**Sliding Parts:**
- Panels slide when loosened
- Sliding exposes screws underneath
- Movement has defined limits (min/max position)

**Hinged Parts:**
- Flaps/covers rotate around pivot
- Rotation may block or unblock screw access
- Defined angle limits (e.g., 0-90 degrees)

**Tensioned Elements:**
- Parts connected by spring constraints
- Removing screws changes tension state
- Results in controlled, animated movement

**Friction-Based Discovery:**
- Parts resist movement until enough screws removed
- Threshold defined per part (e.g., "needs 2 of 3 screws removed")
- Player feels progression toward movement

### 7.5 Direct Manipulation

Beyond tapping screws, player can:
- **Pull** loosened parts (within constraint limits)
- **Drag** sliding elements
- **Nudge** parts to test if they move

**Constraint-Based Drag Behavior:**

Player drags directly on parts—constraint type determines response:

| Constraint Type | Drag Behavior |
|-----------------|---------------|
| **Slider** | Part slides along defined axis |
| **Hinge** | Part rotates around pivot point |
| **Free** | Part moves freely (within bounds) |
| **Static** | No response to drag |

**Rotation as Discovery Tool:**

Rotation exists to:
- Reveal hidden screws
- Change occlusion relationships
- Test whether a part is fully loosened

Rotation is never precision-based or skill-based. Ranges are predefined (e.g., −30° to +30°), with snapping or dampening near limits.

This enables:
- Probing the puzzle without committing
- Discovering hidden dependencies
- Learning through experimentation

---

## 8. Level Design Language

### 8.1 Level Definition

Each level specifies:
- Part hierarchy (parent-child, layers)
- Screw placements (position, color, which parts they hold)
- Tray configuration (colors, capacities)
- Initial tray visibility (which 2 of 4 are visible)
- Physics constraints (joints, limits, friction)

### 8.2 Design Principles

**Early Levels:**
- Teach one concept at a time
- Single constraint type
- Obvious solutions

**Later Levels:**
- Combine multiple constraints
- Color pressure (limited tray space)
- Buffer management strategy
- Physical exploration required

---

## 9. MVP Scope

### Included
- Colored trays with stacked screw visuals
- Hidden trays with interactive cover
- Buffer tray with auto-transfer
- 2D layered parts with basic physics (sliders, hinges)
- Single-tap unscrew interaction
- Auto-placement by color
- Manual restart
- Deterministic, testable physics
- Clean, tactile visuals

### Excluded
- Undo functionality
- Timers
- Scoring system
- Meta progression
- Special screw types
- 3D rotation

**Goal:** MVP should feel complete and satisfying as-is.

---

## 10. Post-MVP Ideas (Future Reference)

### 10.1 Advanced Physics
- Elastic elements (rubber bands)
- Counterweights
- Balance-shifting parts

### 10.2 Special Screws
- Rusted screws (need loosening first)
- Double-lock screws
- Multi-part pinning screws

### 10.3 Environmental Mechanics
- Magnetic parts
- Sticky surfaces
- Temperature mechanics (expand/contract)

### 10.4 Meta Systems
- New tray types
- Limited-use tools
- Cosmetic customization

---

## 11. Technical Notes

### 11.1 E2E Testing Requirements

**Input Simulation:**
The test harness must support simulating all player inputs:
```typescript
// Touch/tap interactions
await window.__gameTest.act({ type: 'tap', x: 100, y: 100 })

// Drag gestures (for sliding parts, pulling, nudging)
await window.__gameTest.act({
  type: 'drag',
  startX: 100, startY: 100,
  endX: 200, endY: 100,
  duration: 300 // ms
})

// Pointer events (low-level)
await window.__gameTest.act({ type: 'pointerDown', x: 100, y: 100 })
await window.__gameTest.act({ type: 'pointerMove', x: 150, y: 100 })
await window.__gameTest.act({ type: 'pointerUp', x: 200, y: 100 })

// Screw-specific actions
await window.__gameTest.act({ type: 'unscrewAt', x: 100, y: 100 })
await window.__gameTest.act({ type: 'unscrewScrew', screwId: 'screw-1' })

// Tray interactions
await window.__gameTest.act({ type: 'openTrayCover' })
```

**Physics Control:**
The physics system must be deterministic and controllable:
```typescript
// Set deterministic state
window.__gameTest.physics.setState(serializedState)

// Step physics by exact delta (for frame-by-frame testing)
window.__gameTest.physics.step(deltaMs)

// Query constraint states
window.__gameTest.physics.getConstraint(partId)

// Verify positions deterministically
window.__gameTest.physics.getPartPosition(partId)

// Pause/resume physics simulation
window.__gameTest.physics.pause()
window.__gameTest.physics.resume()
```

**Game State Queries:**
```typescript
// Query screws
window.__gameTest.game.getScrews() // returns all screws with state
window.__gameTest.game.getScrew(screwId) // single screw

// Query trays
window.__gameTest.game.getTrays() // returns tray states, contents
window.__gameTest.game.getBufferTray() // buffer contents

// Query parts
window.__gameTest.game.getParts() // returns part states (locked, free, etc.)

// Win/lose state
window.__gameTest.game.isWon()
window.__gameTest.game.isStuck() // no legal moves
```

### 11.2 Architecture Alignment

Fits existing ECS pattern:
- **Components**: ScrewComponent, PartComponent, TrayComponent, ConstraintComponent
- **Systems**: ScrewInteractionSystem, PhysicsSystem, TrayPlacementSystem, AutoTransferSystem
- **Entities**: ScrewEntity, PartEntity, TrayEntity

---

## 12. MVP Design Locks

The following are **locked decisions** for MVP:

| Decision | Status |
|----------|--------|
| 2D top-down camera | ✅ Locked |
| No isometric elements | ✅ Locked |
| Constrained physics | ✅ Locked |
| Movement & rotation for puzzle parts only | ✅ Locked |
| UI detached from world physics | ✅ Locked |
| Gravity toward screen bottom | ✅ Locked |
| Constraint-based drag behavior | ✅ Locked |

Any future experimentation must not violate these constraints.

---

## 13. Summary

Screw Master succeeds because:
- Starts simple, grows organically
- Physics adds discovery, not frustration
- Tray system creates unique strategic tension
- Feels handcrafted, not abstract

**Most importantly:**
> The player learns by touching, not by reading rules.
