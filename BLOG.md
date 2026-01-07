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
