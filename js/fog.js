/**
 * FogSystem - Uncertainty visualization overlay for the hex grid
 * 
 * Fog represents uncertainty/incomplete information about the landscape.
 * Used primarily in:
 * - Act 3: Player must read ball behavior without seeing the landscape
 * - Act 4: Fog clears when honest communication is chosen
 * - Act 5: Scout action reveals fog
 */

class FogSystem {
    /**
     * @param {HexGrid} grid - The hex grid to apply fog to
     */
    constructor(grid) {
        this.grid = grid;

        // Track visibility state per hex
        this.visibility = new Map(); // "q,r" -> visibility level (0 to 1)

        // Initialize all as revealed
        this._initializeVisibility(true);
    }

    /**
     * Initialize visibility for all hexes
     * @param {boolean} revealed - Initial visibility state
     */
    _initializeVisibility(revealed = true) {
        for (const cell of this.grid.getAllCells()) {
            const key = `${cell.q},${cell.r}`;
            this.visibility.set(key, revealed ? 1 : 0);
            cell.isRevealed = revealed;
        }
    }

    /**
     * Cover everything in fog
     */
    coverAll() {
        for (const cell of this.grid.getAllCells()) {
            const key = `${cell.q},${cell.r}`;
            this.visibility.set(key, 0);
            cell.isRevealed = false;
        }
    }

    /**
     * Reveal everything
     */
    revealAll() {
        for (const cell of this.grid.getAllCells()) {
            const key = `${cell.q},${cell.r}`;
            this.visibility.set(key, 1);
            cell.isRevealed = true;
        }
    }

    /**
     * Get visibility for a specific hex
     * @returns {number} 0 (hidden) to 1 (fully visible)
     */
    getVisibility(q, r) {
        const key = `${q},${r}`;
        return this.visibility.get(key) ?? 1;
    }

    /**
     * Set visibility for a specific hex
     */
    setVisibility(q, r, level) {
        const key = `${q},${r}`;
        const clamped = Math.max(0, Math.min(1, level));
        this.visibility.set(key, clamped);

        const cell = this.grid.getHex(q, r);
        if (cell) {
            cell.isRevealed = clamped > 0.5;
        }
    }

    /**
     * Reveal hexes in a radius around a point (for Scout action)
     * @param {number} centerQ 
     * @param {number} centerR 
     * @param {number} radius - Number of hex rings to reveal
     * @param {boolean} animated - Whether to animate the reveal
     */
    reveal(centerQ, centerR, radius = 1, animated = false) {
        const center = this.grid.getHex(centerQ, centerR);
        if (!center) return;

        // Reveal center
        this.setVisibility(centerQ, centerR, 1);

        // Reveal rings
        for (let ring = 1; ring <= radius; ring++) {
            const hexesInRing = this._getHexesInRing(centerQ, centerR, ring);
            for (const hex of hexesInRing) {
                if (animated) {
                    // Delayed reveal for animation effect
                    setTimeout(() => {
                        this.setVisibility(hex.q, hex.r, 1);
                    }, ring * 100);
                } else {
                    this.setVisibility(hex.q, hex.r, 1);
                }
            }
        }
    }

    /**
     * Cover hexes in a radius
     */
    cover(centerQ, centerR, radius = 1) {
        const center = this.grid.getHex(centerQ, centerR);
        if (!center) return;

        this.setVisibility(centerQ, centerR, 0);

        for (let ring = 1; ring <= radius; ring++) {
            const hexesInRing = this._getHexesInRing(centerQ, centerR, ring);
            for (const hex of hexesInRing) {
                this.setVisibility(hex.q, hex.r, 0);
            }
        }
    }

    /**
     * Reveal a random hex (for gradual fog clearing)
     * @returns {HexCell|null} The revealed hex, or null if all revealed
     */
    revealRandom() {
        const hiddenHexes = this.grid.getAllCells().filter(
            cell => !cell.isRevealed
        );

        if (hiddenHexes.length === 0) return null;

        const randomHex = hiddenHexes[Math.floor(Math.random() * hiddenHexes.length)];
        this.setVisibility(randomHex.q, randomHex.r, 1);
        return randomHex;
    }

    /**
     * Get hexes at a specific ring distance (helper)
     */
    _getHexesInRing(centerQ, centerR, radius) {
        const results = [];
        const directions = HexGrid.DIRECTIONS;

        let q = centerQ - radius;
        let r = centerR + radius;

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < radius; j++) {
                const cell = this.grid.getHex(q, r);
                if (cell) {
                    results.push(cell);
                }
                const dir = directions[i];
                q += dir.q;
                r += dir.r;
            }
        }

        return results;
    }

    /**
     * Check if a hex is revealed
     */
    isRevealed(q, r) {
        return this.getVisibility(q, r) > 0.5;
    }

    /**
     * Count hidden hexes
     */
    getHiddenCount() {
        let count = 0;
        for (const [, visibility] of this.visibility) {
            if (visibility < 0.5) count++;
        }
        return count;
    }

    /**
     * Count revealed hexes
     */
    getRevealedCount() {
        let count = 0;
        for (const [, visibility] of this.visibility) {
            if (visibility >= 0.5) count++;
        }
        return count;
    }

    /**
     * Get percentage of revealed hexes
     */
    getRevealedPercentage() {
        const total = this.visibility.size;
        if (total === 0) return 100;
        return (this.getRevealedCount() / total) * 100;
    }

    /**
     * Draw fog overlay (alternative to per-hex drawing)
     * Useful for smoother fog effects
     */
    draw(ctx) {
        for (const cell of this.grid.getAllCells()) {
            const visibility = this.getVisibility(cell.q, cell.r);

            if (visibility < 1) {
                const { x, y } = this.grid.hexToPixel(cell.q, cell.r);
                const size = this.grid.hexSize;

                // Draw fog hex
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 180) * (60 * i - 30);
                    const hx = x + size * Math.cos(angle);
                    const hy = y + size * Math.sin(angle);
                    if (i === 0) {
                        ctx.moveTo(hx, hy);
                    } else {
                        ctx.lineTo(hx, hy);
                    }
                }
                ctx.closePath();

                // Fog opacity based on visibility
                const fogOpacity = (1 - visibility) * 0.85;
                ctx.fillStyle = `rgba(200, 200, 220, ${fogOpacity})`;
                ctx.fill();

                // Add subtle texture
                if (visibility < 0.5) {
                    ctx.fillStyle = `rgba(180, 180, 200, ${fogOpacity * 0.4})`;
                    const numDots = 3;
                    for (let i = 0; i < numDots; i++) {
                        const dotX = x + (Math.random() - 0.5) * size;
                        const dotY = y + (Math.random() - 0.5) * size * 0.8;
                        const dotSize = 2 + Math.random() * 3;
                        ctx.beginPath();
                        ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }

    /**
     * Reset fog system
     */
    reset(allRevealed = true) {
        this._initializeVisibility(allRevealed);
    }
}

// Export for use in other modules
window.FogSystem = FogSystem;
