<!-- BEGIN layout design system (managed) -->
## Design system: Linear

This project uses the Linear design system (Developer tool, dark-first design system inspired by Linear), served from `.layout/`. Read `.layout/layout.md` before writing any UI code.

### Token quick reference

```css
--linear-bg-app: #0A0A0F;
--linear-bg-surface: #12121A;
--linear-bg-elevated: #1A1A25;
--linear-bg-hover: #22222F;
--linear-border: rgba(255, 255, 255, 0.08);
--linear-border-strong: rgba(255, 255, 255, 0.15);
--linear-border-focus: #5E6AD2;
--linear-text-primary: #E8E8ED;
--linear-text-secondary: rgba(232, 232, 237, 0.65);
--linear-text-muted: rgba(232, 232, 237, 0.4);
--linear-accent: #5E6AD2;
--linear-accent-hover: #6E7AE2;
--linear-accent-subtle: rgba(94, 106, 210, 0.15);
--linear-status-active: #F2C94C;
--linear-status-done: #4CB782;
--linear-status-backlog: #8B8B99;
--linear-font-sans: 'Inter', -apple-system, sans-serif;
--linear-font-mono: 'JetBrains Mono', monospace;
--linear-space-xs: 4px;
--linear-space-sm: 8px;
--linear-space-md: 12px;
--linear-space-lg: 16px;
--linear-space-xl: 24px;
--linear-radius-sm: 4px;
/* ...and 2 more in .layout/tokens.css */
```

### Rules

- Use the CSS custom properties from `.layout/tokens.css`. Never hardcode colours, spacing, or radii.
- Follow the component specs and anti-pattern rules in `.layout/layout.md`.
- Aesthetic: Dark, minimal, developer-focused.

### Full context via MCP

For queryable, always-current design-system context, run the Layout MCP server:

```bash
npx -y @layoutdesign/context serve
```

Key tools: `get-design-system`, `get-tokens`, `get-component`, `list-components`, `check-compliance`. Validate generated UI with `check-compliance` before finishing.
<!-- END layout design system (managed) -->
