# Screw Master - Level Design Guide

*For level designers and puzzle creators*

## 1. Purpose

This document defines:
- How levels are structured
- How difficulty is introduced and escalated
- How physics, trays, and hidden elements combine safely
- How to think when creating new puzzles

**This is a design rulebook, not a content list.**

---

## 2. Core Philosophy

### 2.1 Levels Are Mechanical Problems

Each level represents a realistic mechanical situation, not an abstract puzzle.

A good level answers:
- What is holding this object together?
- What happens when tension is released?
- What information is hidden, and how can it be discovered?

### 2.2 Levels Teach Through Interaction

There are:
- No tutorials
- Minimal text
- No forced instructions

> Levels are designed so the first successful interaction teaches the rule.

---

## 3. Level Structure

Each level is composed of four layers:

| Layer | Contents |
|-------|----------|
| **Puzzle Space** | Parts, screws, constraints, physics |
| **Constraint Space** | Colored trays, buffer tray, tray cover |
| **Discovery Space** | Hidden screws, movable parts, rotation clues |
| **Goal Definition** | What counts as "complete" |

---

## 4. Level Components

### 4.1 Screws

Color-coded screws placed deliberately to:
- Gate progress
- Create false starts
- Encourage exploration

**Design Rules:**
- Never hide all progress behind a single hidden screw
- At least one visible, valid move must exist at level start

### 4.2 Parts

Parts define the mechanical logic of the level.

| Type | Behavior |
|------|----------|
| **Fixed** | Never move until fully released |
| **Constrained** | Slide or rotate once loosened |
| **Free** | Detach and exit the puzzle |

**Design Rules:**
- Every moving part must visually signal that it can move
- Movement must reveal information, not solve the puzzle alone

### 4.3 Trays (Strategic Pressure)

**Visible Trays:**
- Two leftmost trays are always visible
- Capacities vary per level
- Tray choice defines most strategic tension

**Hidden Trays:**
- Two rightmost trays under a cover
- Opening the cover is a commitment, not a free action

**Design Rules:**
- Do not require opening the cover immediately
- Early levels should allow solving without opening it

### 4.4 Buffer Tray (Error Absorption)

- Capacity: 5 screws
- Accepts any color

**Design Rules:**
- Buffer tray should save the player from early mistakes
- Buffer tray should NOT be sufficient to brute-force a level
- Levels should punish overuse, not use

---

## 5. Physics in Level Design

### 5.1 Physics as Gate, Not Solver

Physics does not solve puzzles; it unlocks information.

**Allowed Uses:**
- Sliding panels revealing screws
- Hinges blocking access until loosened
- Tension preventing movement

**Forbidden Uses:**
- Physics-based timing challenges
- Precision stacking
- Unstable cascades

### 5.2 Movement & Rotation Rules

All movement must be:
- **Constrained** - defined limits
- **Reversible** - can be undone by player
- **Readable** - player understands what happened

Rotation ranges must be:
- Small (e.g., −30° to +30°)
- Mechanically justified
- Visually hinted

> A player should test movement before committing.

---

## 6. Hidden Information Design

### 6.1 What Can Be Hidden
- Screws
- Tray relevance (future colors)
- Physical dependencies

### 6.2 How Information Is Revealed
- Pulling a part
- Rotating a loose element
- Removing a blocking screw

**Design Rule:**
> Discovery should feel earned, not surprising.

---

## 7. Difficulty Progression

### Phase 1: Orientation

| Element | Specification |
|---------|---------------|
| Parts | 1–2 |
| Colors | 1 |
| Hidden trays | None |
| Hidden screws | None |

**Goal:** Teach unscrewing + tray logic.

---

### Phase 2: Constraint Awareness

| Element | Specification |
|---------|---------------|
| Colors | 2–3 |
| Tray capacities | Vary |
| Buffer tray | Becomes relevant |

**Goal:** Teach planning and mistake recovery.

---

### Phase 3: Discovery

| Element | Specification |
|---------|---------------|
| Hidden screws | Yes, via sliding/rotation |
| Physics | First meaningful interactions |

**Goal:** Teach probing and exploration.

---

### Phase 4: Commitment

| Element | Specification |
|---------|---------------|
| Tray cover | Becomes necessary |
| Buffer pressure | Increases |
| Solution paths | Multiple valid paths |

**Goal:** Teach commitment and foresight.

---

### Phase 5: Mastery

| Element | Specification |
|---------|---------------|
| Systems | Physics + trays + discovery interlocked |
| Obvious moves | Few |
| Solutions | Clean, elegant |

**Goal:** Reward understanding, not speed.

---

## 8. Failure & Recovery

**There is no hard fail state.**

Failure is defined as:
- No legal moves remaining

Recovery:
- Restart level

**Design Rules:**
- Levels must fail clearly
- The player should know why they failed

---

## 9. Level Evaluation Checklist

Before shipping a level, verify:

- [ ] At least one valid move at start
- [ ] No invisible rules
- [ ] All movement is hinted
- [ ] Buffer tray cannot brute-force solution
- [ ] Hidden elements are discoverable without guessing
- [ ] Solution feels mechanical, not arbitrary

---

## 10. Post-MVP Level Experiments

### Safe Experimental Directions
- Levels with optional physics interactions
- Multi-stage objects
- Reconfigurable tray layouts

### Still Forbidden
- Isometric perspective
- Physics chaos
- Precision dexterity challenges

---

## 11. Summary

A good level in this game:
- Feels like a real object
- Rewards curiosity
- Respects player intuition
- Remains readable at all times

**Level design is about guiding thought, not hiding answers.**
