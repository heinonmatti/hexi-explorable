# Resilience Landscapes

An interactive explorable explanation teaching how complex systems fail—using attractor dynamics, tipping points, and early warning signals. Built in the style of [Nicky Case](https://ncase.me).

## 🎯 What You'll Learn

Through hands-on interaction with a hexagonal "stability landscape," users discover:

1. **Hysteresis** — Why it's easy to fall into bad states but expensive to escape
2. **N-Tipping vs B-Tipping** — Two different paths to system failure  
3. **Early Warning Signals** — Reading the "wobble" before collapse
4. **The Myth of Panic** — Why transparency beats false reassurance
5. **Governance Tradeoffs** — Balancing optimization vs. adaptability

## 🚀 Getting Started

### Run Locally

No build step required! Just serve the files:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Or use VS Code's Live Server extension
```

Then open `http://localhost:8000` in your browser.

### Project Structure

```
hexi-explorable/
├── index.html          # Main entry point
├── css/
│   └── styles.css      # All styling
├── js/
│   ├── main.js         # App initialization
│   ├── hexGrid.js      # Hex coordinate system
│   ├── ball.js         # Physics simulation
│   └── acts/           # Individual act implementations
├── data/               # Scientific background (PDFs)
└── assets/             # Fonts and images
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test locally in your browser
5. Submit a pull request

## 📚 Scientific Background

This explorable is based on research on attractor landscapes and resilience:

- Heino (2022) - Attractor landscapes: A unifying conceptual model
- Heino (2024) - From a false sense of safety to resilience under uncertainty

See the `data/` folder for full references.

## 📄 License

[MIT License](LICENSE) - Feel free to use, modify, and share.

## 🙏 Acknowledgments

- Inspired by [Nicky Case's](https://ncase.me) explorable explanations
- Scientific foundation from the Heino research papers
