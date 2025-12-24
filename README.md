# Resilience Landscapes

An interactive explorable explanation teaching how complex systems fail and how they're navigated — using attractor dynamics, tipping points, ruin risk, and so forth. See http://mattiheino.com/sense-of-safety for background. 

NOTE: This was built using Google Antigravity. I don't know anything about software development.

## 🎯 What You'll Learn

Through hands-on interaction with a hexagonal "stability landscape," users discover:

1. **Hysteresis** — Why it's easy to fall into bad states but expensive to escape
2. -- COMING UP --

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

- Heino, M. T. J., Proverbio, D., Marchand, G., Resnicow, K., & Hankonen, N. (2022). Attractor landscapes: A unifying conceptual model for understanding behaviour change across scales of observation. Health Psychology Review, 17(4), 655–672. https://doi.org/10.1080/17437199.2022.2146598
- Heino, M. T. J., Proverbio, D., Saurio, K., Siegenfeld, A., & Hankonen, N. (2024). From a false sense of safety to resilience under uncertainty. Frontiers in Psychology, 15. https://doi.org/10.3389/fpsyg.2024.1346542

See the `data/` folder for full references.

## 📄 License

[MIT License](LICENSE) - Feel free to use, modify, and share.

## 🙏 Acknowledgments

- Inspired by Nicky Case's [attractor landscapes explorable](https://ncase.me/attractors)
- Grateful for Daniele Proverbio for his collaboration on the related research papers
