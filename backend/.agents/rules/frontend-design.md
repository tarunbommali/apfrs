---
name: frontend-design
description: Enforce layout design rules and tokens for frontend development tasks.
trigger: always_on
---
# Frontend Design System Rules

Treat the layout design system as the source of truth for the visual design system. Before creating or modifying frontend UI, inspect it. Do not replace the design system with your own visual choices.

All UI styling MUST strictly follow the design system tokens and component guidelines specified in the layout design system docs:

@../../.layout/layout.md

Key styling constraints:
- Use the CSS custom properties from `.layout/tokens.css` (or `.layout/tokens.json`). Never hardcode colors, spacing, or radii.
- Aesthetic: Dark, minimal, developer-focused.
- Avoid introducing arbitrary spacing, colors, radii, or typography.
- Use only the allowed background roles (`--linear-bg-app`, `--linear-bg-surface`, `--linear-bg-elevated`, `--linear-bg-hover`).
- Keep border radii strict: 4px (sm), 6px (md), 8px (lg). No border-radius above 8px.
- Use the Layout MCP server to fetch design-system details when needed.
