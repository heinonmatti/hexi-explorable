# Contributing to Resilience Landscapes

Thank you for your interest in contributing! This guide will help you get started.

## 🌟 Ways to Contribute

- **Bug fixes** — Found something broken? Fix it!
- **New features** — Have an idea? Let's discuss it first in an Issue
- **Documentation** — Help improve explanations and comments
- **Design** — Suggest visual improvements or accessibility enhancements
- **Scientific accuracy** — Help ensure the concepts are correctly represented

## 🔧 Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/heinonmatti/hexi-explorable.git
   cd hexi-explorable
   ```

2. **Start a local server**
   ```bash
   python -m http.server 8000
   # or: npx serve
   ```

3. **Open in browser**
   Navigate to `http://localhost:8000`

## 📝 Code Style Guidelines

### JavaScript

- Use ES6+ features (const/let, arrow functions, template literals)
- Use descriptive variable names
- Add comments explaining "why", not "what"
- Keep functions small and focused

```javascript
// ✅ Good
const calculateGradient = (hex, neighbors) => {
  // Find steepest descent for ball physics
  return neighbors.reduce((lowest, n) => 
    n.elevation < lowest.elevation ? n : lowest
  , hex);
};

// ❌ Avoid
function calc(h, n) {
  var l = h;
  for (var i = 0; i < n.length; i++) {
    if (n[i].e < l.e) l = n[i];
  }
  return l;
}
```

### CSS

- Use CSS custom properties (variables) for colors and spacing
- Mobile-first approach
- Keep selectors simple

### HTML

- Semantic elements where possible
- Accessible (proper ARIA labels, keyboard navigation)

## 🌿 Branch Naming

Use descriptive branch names:

- `feature/act3-wobble-trail` — New features
- `fix/ball-physics-momentum` — Bug fixes
- `docs/readme-update` — Documentation
- `refactor/hex-grid-cleanup` — Code improvements

## 📤 Pull Request Process

1. **Create an Issue first** (for features) to discuss the approach
2. **Branch from `main`**
3. **Make focused commits** with clear messages
4. **Test thoroughly** — check all 5 acts still work
5. **Update documentation** if needed
6. **Submit PR** with a clear description

### PR Template

```markdown
## What does this PR do?
Brief description of changes

## How to test
Steps to verify the change works

## Screenshots (if UI changes)
Before/after if applicable
```

## 🐛 Reporting Bugs

Please include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if helpful

## 💬 Questions?

Open an Issue with the `question` label, or reach out to the maintainers.

---

Thank you for helping make Resilience Landscapes better! 🎉
