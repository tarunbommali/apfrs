---
name: frontend-design
description: Use this skill when modifying, redesigning, or creating frontend UI components, views, or layouts in the APFRS project.
---

# Frontend Design Workflow Skill

This skill teaches the agent how to build and refactor frontend user interfaces in the APFRS workspace in a high-fidelity, professional manner, adhering to the project's design system.

## Workflow Steps

### 1. Analyze and Inspect
- Inspect the existing UI code and visual page layout before writing any code.
- Read and understand the design system guidelines:
  - [.layout/layout.md](file:///c:/Users/Tarun/.vscode/workspace/Projects/apfrs/.layout/layout.md)
  - [.layout/tokens.json](file:///c:/Users/Tarun/.vscode/workspace/Projects/apfrs/.layout/tokens.json)
  - [.layout/tokens.css](file:///c:/Users/Tarun/.vscode/workspace/Projects/apfrs/.layout/tokens.css)
- Inspect existing components in the codebase to see what is already built. Reuse them to ensure UI consistency and avoid code duplication.

### 2. Formulate a Plan
- Draft a layout plan that maintains the information hierarchy, simplifies navigation, and reduces redundant sections.
- Identify the design tokens (colors, spacing, typography, radii) from Layout Context that map to the components.
- Do not introduce arbitrary values. Rely strictly on:
  - React
  - Tailwind (if configured)
  - Layout-provided components/styles
  - CSS custom properties/tokens

### 3. Implementation
- Apply modifications to frontend files according to the planned hierarchy.
- Use Layout MCP server tools when design-system context or details are needed.
- Keep the existing API contracts between the frontend and backend unchanged. Do not modify backend functionality unless explicitly requested.

### 4. Verification and Polish
- Inspect the rendered result by running the dev server.
- Verify responsive layout behavior across different viewport sizes.
- Verify visual consistency (e.g., hover states, text colors, margins).
- Clean up any duplicated UI elements and ensure existing functionality still works.
- (Recommended) Run Layout Context's `check-compliance` tool or command to validate design system alignment.
