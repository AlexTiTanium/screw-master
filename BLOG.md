# Screw Master - Developer Blog

A development journal tracking progress, discoveries, and next steps.

## About This Project

Screw Master is an interactive game built with a modern TypeScript stack, combining Play Co's internal frameworks for a robust game development experience.

**Architecture**: The app uses Astro as the application framework (handling screens, plugins, lifecycle) with ODIE's Entity-Component-System (ECS) embedded inside screens for game logic. PixiJS v8 powers the rendering.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 25 |
| Language | TypeScript 5.9 (strict) |
| Build | Vite 7.2 |
| App Framework | @play-co/astro |
| Game Framework | @play-co/odie (ECS) |
| Rendering | @play-co/pixijs (PixiJS v8 fork) |
| Testing | Vitest + Playwright |

---

## Entries

### Jan 12, 2026 - The Bug Report System (Teaching AI to Debug Visual Chaos)

**The real problem isn't writing code with AI — it's writing code that solves *your* problem.**

Started with tray animations. These are complex: multiple moving parts, interpolation between states. Describing this in a prompt? Time-consuming nightmare (I tried). Solution: prototype the animation states in Figma, then ask AI to implement the interpolation. Worked — not on the first try, some elements landed in wrong spots — but a few commands later, it behaved exactly as intended.

**Then came the chaos.**

With animations running, the game became a storm of concurrent motion: screws flying, trays sliding, user input happening simultaneously. Race conditions everywhere. Screws appearing in wrong places for split seconds. Visual bugs that vanish before you can describe them.

**The debugging dead-end:** Try explaining "I saw a screw in the wrong spot for one frame" in a prompt. E2E tests couldn't help either — no way to reproduce timing-dependent issues.

**The solution: One-click bug reports.**

Built a system that captures everything in a single click during gameplay:
- **Game logs** with frame numbers and timings for every action, animation, and decision
- **Screenshot** at the moment of the bug
- **Full ECS state** dump
- **Render graph state**
- All packaged into a folder via Vite middleware

Added documentation explaining the bug-solving workflow:
1. Report a bug (one click)
2. AI reads the report and reproduces it in an E2E test
3. AI fixes the bug
4. Same E2E input confirms the fix

**See it in action:** [PR #11](https://github.com/AlexTiTanium/screw-master/pull/11) — the video shows the bug reproduction and fix confirmation.

**Why this matters:** E2E tests now guard against regressions. Each bug found adds to a safety net. The game stays stable enough to keep building features without fear of breaking everything.

**The bigger idea:** This isn't just for bugs. Same system could drive feature development — pause the game, press a button, describe what you want, and AI gets full context (game state + your request) to implement and test the feature.

**Next up:** Maybe extend this with state-change sampling. Could be heavy, but the potential is there.

---

### Jan 9, 2026 - Figma MCP and Automated PR Media

**Today was a breakthrough day.** Two major wins that changed the development workflow entirely.

**Figma MCP Integration:** Started the day by setting up the Figma MCP server — it automatically exports assets and creates scenes from Figma mockups. Got it working on the second attempt. First try failed because Figma was exporting "original size" images instead of "layout size" images, which threw everything off. (Another reminder: AI pipelines that respect image dimensions would make life so much easier.)

**Game Logic & Animations:** Implemented the core game logic and screw animations. Everything was validated through E2E tests, but screenshots alone felt limiting — how do you really verify animations?

**The idea:** What if PRs could show exactly what changed visually?

**The solution:**
1. Automatic screenshot attachments for 3 different aspect ratios
2. Automatic video recording of gameplay attached to PRs

**See it in action:** [PR #2](https://github.com/AlexTiTanium/screw-master/pull/2) — that video was generated automatically during the E2E run.

This changes everything for visual QA. No more "trust me, the animation looks right."

**Next up:** Improving core gameplay to make it actually fun, and adding physics. The physics engine will be challenging to test via E2E... but let's see what's possible.

---

### Jan 8, 2026 - Assets Crafting (The AI Art Tool Gauntlet)

**Today was asset day.** Armed with concept art, I dove into the world of AI art generation tools. Spoiler: it's a mixed bag at best.

**The contenders:**
- **layer.ai** - Fancy landing page, charges upfront, totally useless (or doesn't work, or both)
- **scenario.com** - Same story. Marketing > functionality
- **recraft.ai** - The only one that showed promise... when it felt like it. Sometimes you get screws, sometimes you get mushrooms. Ask for wood texture? Here's a white circle. Consistency is not its strong suit.

Still want to try **ludo.ai** for sprite animation. I can't even imagine how that'll fail, but we'll find out.

**The real pain:** None of these tools can crop assets (remove empty space). Had to manually crop 50 assets in Asana. At some point I thought "probably faster to write a script for this" — and I might be right.

**The win:** Despite the chaos, I managed to craft something from nothing and got my desired MVP mock. Would a professional artist do this 20x faster and 100x better? Absolutely. But for a prototype, it's not bad. Just... long.

**Hot take:** Current state of AI art tools is nowhere near AI coding tools. The gap is massive.

**Next up:** Seriously considering that auto-crop script. And maybe giving ludo.ai a shot if there's time.

---

### Jan 7, 2026 - Setting Up the ECS Architecture

**The experiment begins.** Rather than reaching for a game template, I decided to give AI (Claude CLI + VS Code extension) full freedom to structure the project from scratch. No MCP servers, just pure conversation-driven development.

The goal: get the latest ODIE ECS framework and PixiJS v8 internal fork playing nicely together with a solid component structure.

**What got done:**
- Wired up complex component structures for the latest ODIE and PixiJS v8 fork
- Built a strong E2E testing foundation with Playwright — visual validation will be critical for this journey
- Multiple refactoring passes to clean up boilerplate and land on a sensible project structure
- Got rendering and testing working end-to-end

**The struggle:** Getting `.npmrc` configured correctly for the private `@play-co` packages. Authentication with GitHub Packages is always a small adventure.

**The win:** A clean, AI-structured codebase with rendering pipeline and test harness both operational.

**Next up:** Planning the core game loop and starting work on a level editor. Time to make something playable.
