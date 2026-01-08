# Screw Master - Art Direction Guide

*For artists and visual designers*

## 1. Visual Philosophy

The game prioritizes **player trust** through visual clarity. Every visual choice supports the core principle:

> If something looks reachable, it is reachable.
> If something looks blocked, it is blocked.

---

## 2. Perspective Rules

### 2.1 Fixed Top-Down View
- Camera locked to **orthographic top-down (90°)**
- No tilt, no fake depth, no perspective distortion
- All puzzle parts viewed from directly above

### 2.2 Why Not Isometric

Isometric is explicitly forbidden because:
- Rotating parts visually overlap in misleading ways
- Depth perception becomes ambiguous when parts move
- Hidden screws may appear reachable when they are not
- Physics interactions become visually "dishonest"

---

## 3. Materials & Textures

### 3.1 Primary Materials

| Material | Usage | Characteristics |
|----------|-------|-----------------|
| **Wood** | Puzzle parts, base objects | Warm tones, visible grain, slight wear |
| **Metal** | Screws, trays, frames | Brushed steel, subtle reflections |
| **Rubber** | Grips, gaskets (future) | Matte, dark tones |

### 3.2 Surface Treatment
- Subtle wear and texture on all materials
- Signs of use (small scratches, patina) for tactile feel
- No pristine, plastic-looking surfaces

---

## 4. Lighting

### 4.1 Light Direction
- Soft, directional lighting from top-left
- Consistent across all puzzles
- Creates subtle shadows for depth perception

### 4.2 What to Avoid
- No volumetric lighting
- No dramatic shadows implying fake height
- No specular highlights that distort shape perception

---

## 5. Depth Representation

Since we use true top-down (no perspective), depth is communicated through:

### 5.1 Allowed Techniques
| Technique | Purpose |
|-----------|---------|
| **Occlusion** | Parts covering other parts |
| **Layering** | Clear visual stacking order |
| **Contact shadows** | Soft shadows where parts meet |
| **Silhouette overlap** | Edge relationships between parts |

### 5.2 Forbidden Techniques
- Perspective distortion
- Vanishing points
- Size-based depth (smaller = farther)
- Atmospheric perspective (haze)

---

## 6. Color Language

### 6.1 Screw Colors
Screws use distinct, saturated colors for easy identification:
- Must be distinguishable at small sizes
- Must remain readable against wood/metal backgrounds
- Suggested palette: Red, Blue, Green, Yellow (expandable)

### 6.2 UI Colors
- Trays match their accepted screw color
- Buffer tray uses neutral color (gray/brown)
- Clear contrast between UI and puzzle area

### 6.3 State Indicators
| State | Visual Treatment |
|-------|------------------|
| Available screw | Full saturation, slight glow |
| Blocked screw | Desaturated, partially occluded |
| Loose part | Subtle movement hint (micro-wobble?) |
| Locked part | Solid, grounded appearance |

---

## 7. Animation Principles

### 7.1 Physics-Based Motion
All part movement should feel:
- **Weighted** - heavier parts move slower
- **Constrained** - respect joint limits
- **Settling** - come to natural rest

### 7.2 UI Animation
- Screws animate into trays (arc motion)
- Buffer auto-transfer has clear visual path
- Tray cover opens with hinge motion

### 7.3 Feedback Animation
- Tap feedback on screws (scale pulse)
- Resistance feedback when dragging blocked parts
- Success feedback when parts fully detach

---

## 8. UI Visual Design

### 8.1 Separation from Puzzle
- UI lives in fixed screen layer
- Clear visual boundary between UI and puzzle
- UI elements never overlap puzzle parts

### 8.2 Tray Design
- Trays show capacity through physical slots
- Screws visually stack when placed
- Full trays show "locked" state clearly

### 8.3 Buffer Tray
- Distinct from colored trays (neutral tone)
- Shows all contained screws
- Indicates remaining capacity

---

## 9. Part Visual States

### 9.1 State Visualization

| Part State | Visual Treatment |
|------------|------------------|
| **Static** | Solid, no interaction hints |
| **Constrained (locked)** | Shows screws holding it |
| **Constrained (loose)** | Subtle "can move" hint |
| **Free** | Clearly detached, ready to move |

### 9.2 Screw Holes
- Visible holes where screws were removed
- Help player track progress
- Different from filled screw positions

---

## 10. MVP Art Constraints

### 10.1 Locked Decisions
| Decision | Requirement |
|----------|-------------|
| Top-down perspective | No exceptions |
| No isometric elements | Strictly forbidden |
| Consistent light direction | Top-left, always |
| Readable at all sizes | Screws, parts, UI |

### 10.2 Asset Requirements (MVP)
- Screw sprites (4 colors minimum)
- Basic part shapes (rectangles, L-shapes)
- Tray designs (colored + buffer)
- Wood and metal textures
- Shadow/occlusion overlays

---

## 11. Post-MVP Visual Ideas

### 11.1 Allowed Enhancements
- Subtle camera shake on heavy movements
- Animated lighting responses to actions
- Dynamic shadows that follow part movement
- Particle effects (dust, metal shavings)

### 11.2 Still Forbidden
- Camera tilt or rotation
- Perspective skew
- Fake depth tricks
- Isometric elements

---

## 12. Reference Style

The visual style aims for:
- **Semi-realistic** (not cartoonish, not photorealistic)
- **Tactile** (you want to touch it)
- **Clean** (readable, not cluttered)
- **Warm** (inviting, not sterile)

Think: Well-crafted wooden puzzle box, photographed from above on a workshop table.
