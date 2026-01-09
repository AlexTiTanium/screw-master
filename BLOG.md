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
