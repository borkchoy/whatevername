# Snip Design System

Reference look: dark minimal interface with warm coral-pink-orange glow, centered hero, chat-like centerpiece input, rounded bordered cards, generous spacing.

## Tokens

### Colors
- `--bg`: `#090909`
- `--bg-elevated`: `#111113`
- `--surface`: `#141418`
- `--surface-soft`: `#1b1b21`
- `--border`: `rgba(255, 255, 255, 0.13)`
- `--text`: `#f5f5f7`
- `--muted`: `#a5a5b3`
- `--success`: `#8ef0c7`
- `--error`: `#ff9ba8`
- `--accent-gradient`: `linear-gradient(135deg, #ff8a66 0%, #ff6fa7 52%, #ffa45d 100%)`
- `--accent-solid`: `#ff8d75`

### Typography
- Font stack: `"Avenir Next", "Segoe UI Variable Display", "SF Pro Display", "Helvetica Neue", sans-serif`
- `--fs-hero`: `clamp(2rem, 5.6vw, 3.75rem)`
- `--fs-body`: `1rem`
- `--fs-small`: `0.92rem`
- Weight range: 500-700
- Tracking: slight negative for hero (`-0.02em`)

### Spacing
- `--space-1`: `0.5rem`
- `--space-2`: `0.75rem`
- `--space-3`: `1rem`
- `--space-4`: `1.5rem`
- `--space-5`: `2rem`
- `--space-6`: `3rem`

### Shape
- `--radius-lg`: `20px`
- `--radius-xl`: `28px`
- `--radius-pill`: `999px`

### Border / Shadow / Glow
- Border: `1px solid var(--border)`
- Card shadow: `0 18px 40px rgba(0, 0, 0, 0.38)`
- Soft inner edge: `inset 0 1px 0 rgba(255, 255, 255, 0.04)`
- Hero glow: layered warm radial gradients behind header/input

## Snip Mapping
- Page header => hero block (centered, bold title, muted subline)
- URL form => primary chat-style pill input + attached gradient action button
- Result and error => inline rounded notices with subtle tinted backgrounds
- Links table => elevated rounded card with soft borders and muted separators
