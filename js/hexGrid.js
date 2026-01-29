/**
 * HexGrid - Honeycomb grid using geometry from Stack Overflow reference
 * https://stackoverflow.com/questions/71942765/honeycomb-hexagonal-grid
 * 
 * Key formulas (pointy-top hexagons):
 *   hexagonAngle = 30 degrees
 *   hexHeight = sin(30°) * sideLength = 0.5 * sideLength
 *   hexRadius = cos(30°) * sideLength ≈ 0.866 * sideLength
 *   hexRectangleHeight = sideLength + 2 * hexHeight = 2 * sideLength
 *   hexRectangleWidth = 2 * hexRadius ≈ 1.732 * sideLength
 * 
 * Positioning:
 *   x = col * hexRectangleWidth + (row % 2) * hexRadius
 *   y = row * (sideLength + hexHeight)
 */

class HexCell {
    constructor(col, row, elevation = 0) {
        this.col = col;
        this.row = row;
        this.elevation = elevation;
        this.isRuin = false;
        this.isRevealed = true;
        this.isHighlighted = false;
        this.isLegalMove = false;
        this.isError = false;
    }

    get key() {
        return `${this.col},${this.row}`;
    }
}

class HexGrid {
    static ELEVATION_COLORS = {
        '-3': '#1b4332',  // Level 1: Darkest green (lowest point)
        '-2': '#2d6a4f',  // Level 2: Dark green
        '-1': '#40916c',  // Level 3: Medium green
        '0': '#b7e4c7',   // Level 4: Light green (flat ground) -> darkened from #d8f3dc
        '1': '#d8f3dc',   // Very palest green
        '2': '#f8fdf9',   // Near white
        '3': '#ffffff',   // White
        'ruin': '#111b15' // Dark forest green/black
    };

    /**
     * Calculate a force that pulls the ball towards the center of its current hex.
     * Only applies if the hex is a local minimum (settling point).
     */
    getCenteringForce(col, row, ballX, ballY, strength = 0.10) {
        const cell = this.getHex(col, row);
        if (!cell) return { x: 0, y: 0 };

        // Check if it's a local minimum (settling point)
        // If any neighbor has strictly lower elevation, don't apply centering force
        const neighbors = this.getNeighbors(col, row);
        for (const n of neighbors) {
            if (n.elevation < cell.elevation - 0.05) { // Small epsilon
                return { x: 0, y: 0 };
            }
        }

        const center = this.hexToPixel(col, row);
        const dx = center.x - ballX;
        const dy = center.y - ballY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5) return { x: 0, y: 0 };

        // Pull towards center with increasing force at edges
        return {
            x: (dx / dist) * strength,
            y: (dy / dist) * strength
        };
    }

    constructor(cols, rows, sideLength = 25) {
        this.cols = cols;
        this.rows = rows;
        this.sideLength = sideLength;

        // Hex geometry from Stack Overflow
        const hexagonAngle = 0.523598776; // 30 degrees in radians
        this.hexHeight = Math.sin(hexagonAngle) * sideLength;
        this.hexRadius = Math.cos(hexagonAngle) * sideLength;
        this.hexRectangleHeight = sideLength + 2 * this.hexHeight;
        this.hexRectangleWidth = 2 * this.hexRadius;

        // Spacing
        this.xSpacing = this.hexRectangleWidth;
        this.ySpacing = sideLength + this.hexHeight;

        // Padding
        this.padding = 10;

        this.cells = new Map();
        this._initGrid();
    }

    _initGrid() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.cells.set(`${c},${r}`, new HexCell(c, r, 0));
            }
        }
    }

    getHex(col, row) {
        return this.cells.get(`${col},${row}`) || null;
    }

    setElevation(col, row, val) {
        const cell = this.getHex(col, row);
        if (cell && !cell.isRuin) {
            cell.elevation = Math.max(-3, Math.min(3, val));
        }
    }

    modifyElevation(col, row, delta) {
        const cell = this.getHex(col, row);
        if (cell && !cell.isRuin) {
            cell.elevation = Math.max(-3, Math.min(3, cell.elevation + delta));
        }
    }

    // Neighbor offsets for pointy-top with odd-row right offset
    getNeighbors(col, row) {
        const neighbors = [];
        const isOddRow = row % 2 === 1;

        // Directions: E, NE, NW, W, SW, SE
        const dirs = isOddRow ? [
            { dc: 1, dr: 0 },
            { dc: 1, dr: -1 },
            { dc: 0, dr: -1 },
            { dc: -1, dr: 0 },
            { dc: 0, dr: 1 },
            { dc: 1, dr: 1 },
        ] : [
            { dc: 1, dr: 0 },
            { dc: 0, dr: -1 },
            { dc: -1, dr: -1 },
            { dc: -1, dr: 0 },
            { dc: -1, dr: 1 },
            { dc: 0, dr: 1 },
        ];

        for (const d of dirs) {
            const n = this.getHex(col + d.dc, row + d.dr);
            if (n) neighbors.push(n);
        }
        return neighbors;
    }

    /**
     * Get pixel position for top-left corner of hex bounding box
     * (This matches the Stack Overflow approach)
     */
    _getHexPosition(col, row) {
        const x = col * this.xSpacing + (row % 2) * this.hexRadius + this.padding;
        const y = row * this.ySpacing + this.padding;
        return { x, y };
    }

    /**
     * Get center of hex in pixels
     */
    hexToPixel(col, row) {
        const pos = this._getHexPosition(col, row);
        return {
            x: pos.x + this.hexRadius,
            y: pos.y + this.hexRectangleHeight / 2
        };
    }

    /**
     * Convert pixel to grid coordinates
     */
    pixelToHex(px, py) {
        // Remove padding
        px -= this.padding;
        py -= this.padding;

        // Approximate row
        const row = Math.round(py / this.ySpacing);

        // Adjust x for row offset
        let adjustedX = px;
        if (row % 2 === 1) {
            adjustedX -= this.hexRadius;
        }

        // Approximate col
        const col = Math.round(adjustedX / this.xSpacing);

        // Find closest hex
        let best = { col, row };
        let bestDist = Infinity;

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const tr = row + dr;
                const tc = col + dc;
                const cell = this.getHex(tc, tr);
                if (cell) {
                    const center = this.hexToPixel(tc, tr);
                    const dist = Math.hypot(px + this.padding - center.x, py + this.padding - center.y);
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = { col: tc, row: tr };
                    }
                }
            }
        }

        return best;
    }

    getHexAtPixel(x, y, strict = false) {
        const coords = this.pixelToHex(x, y);
        const cell = this.getHex(coords.col, coords.row);

        if (!cell || !strict) return cell;

        // Strict boundary check: is it actually inside this hex?
        const center = this.hexToPixel(cell.col, cell.row);
        const dx = Math.abs(x - center.x);
        const dy = Math.abs(y - center.y);

        // Pointy-top hex constraint (approximate but effective):
        // 1. Within horizontal radius and vertical sideLength
        if (dx > this.hexRadius || dy > this.sideLength) return null;
        // 2. Within diagonal corners (approximate with dy < sideLength - dx * tan(30))
        // sideLength is h, hexRadius is r. The slope of the top-right edge is (h/2)/r = 0.5 * sideLength / hexRadius
        // But the Stack Overflow geometry used here defines sideLength as the straight edge.
        // Let's use the standard pointy-top radius/height constraint.
        if (this.sideLength - dy < dx * 0.577) return null;

        return cell;
    }

    calculateGradient(col, row) {
        const cell = this.getHex(col, row);
        if (!cell) return { x: 0, y: 0 };

        const neighbors = this.getNeighbors(col, row);
        if (!neighbors.length) return { x: 0, y: 0 };

        const pos = this.hexToPixel(col, row);
        let gx = 0, gy = 0;

        for (const n of neighbors) {
            const npos = this.hexToPixel(n.col, n.row);
            const dx = npos.x - pos.x;
            const dy = npos.y - pos.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
                const weight = (cell.elevation - n.elevation) / dist;
                gx += (dx / dist) * weight;
                gy += (dy / dist) * weight;
            }
        }

        const mag = Math.hypot(gx, gy);
        if (mag > 0) { gx /= mag; gy /= mag; }
        return { x: gx, y: gy };
    }

    getElevationColor(cell) {
        if (cell.isRuin) return HexGrid.ELEVATION_COLORS['ruin'];

        const elevation = Math.max(-3, Math.min(3, cell.elevation));

        // Find the two discrete steps to interpolate between
        const low = Math.floor(elevation);
        const high = Math.min(3, low + 1);

        if (low === high) return HexGrid.ELEVATION_COLORS[low.toString()];

        const colorLow = HexGrid.ELEVATION_COLORS[low.toString()];
        const colorHigh = HexGrid.ELEVATION_COLORS[high.toString()];

        // Weight is the fractional part
        const t = elevation - low;

        return this._interpolateColors(colorLow, colorHigh, t);
    }

    /**
     * Interpolate between two hex colors
     */
    _interpolateColors(hex1, hex2, t) {
        const rgb1 = this._hexToRgb(hex1);
        const rgb2 = this._hexToRgb(hex2);

        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

        return `rgb(${r}, ${g}, ${b})`;
    }

    _hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }

    /**
     * Draw hexagon using Stack Overflow vertex positions
     */
    drawHex(ctx, cell, viewOffset = { x: 0, y: 0 }) {
        const pos = this._getHexPosition(cell.col, cell.row);
        const x = pos.x - viewOffset.x;
        const y = pos.y - viewOffset.y;

        const vertices = [
            { x: x + this.hexRadius, y: y }, // Top Center
            { x: x + this.hexRectangleWidth, y: y + this.hexHeight }, // Top Right
            { x: x + this.hexRectangleWidth, y: y + this.hexHeight + this.sideLength }, // Bottom Right
            { x: x + this.hexRadius, y: y + this.hexRectangleHeight }, // Bottom Center
            { x: x, y: y + this.sideLength + this.hexHeight }, // Bottom Left
            { x: x, y: y + this.hexHeight } // Top Left
        ];

        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = this.getElevationColor(cell);
        ctx.fill();

        // Highlight/Legal move feedback (Saturation for legal, Contrast for illegal)
        if (cell.isHighlighted) {
            if (cell.isLegalMove) {
                // "High Saturation": We draw a saturated version of the base color
                ctx.save();
                ctx.filter = 'saturate(350%) brightness(1.1)';
                ctx.fillStyle = this.getElevationColor(cell);
                ctx.fill();
                ctx.restore();

                // Softer dark border
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                // "Low Contrast": Wash out with high-opacity white
                ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(150, 150, 150, 0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        } else {
            // Standard border for non-highlighted cells
            ctx.strokeStyle = 'rgba(50,50,50,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw thick red borders for Out of Bounds edges
        const isOddRow = cell.row % 2 === 1;
        const dirOffsets = isOddRow ? [
            { dc: 1, dr: 0 }, { dc: 1, dr: -1 }, { dc: 0, dr: -1 },
            { dc: -1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 1, dr: 1 }
        ] : [
            { dc: 1, dr: 0 }, { dc: 0, dr: -1 }, { dc: -1, dr: -1 },
            { dc: -1, dr: 0 }, { dc: -1, dr: 1 }, { dc: 0, dr: 1 }
        ];

        // Map offsets to edges: 0:Right, 1:TopRight, 2:TopLeft, 3:Left, 4:BottomLeft, 5:BottomRight
        // Vertex pairs for edges: 
        // 1-2 (Right), 0-1 (TopRight), 5-0 (TopLeft), 4-5 (Left), 3-4 (BottomLeft), 2-3 (BottomRight)
        const edges = [
            [1, 2], [0, 1], [5, 0], [4, 5], [3, 4], [2, 3]
        ];

        ctx.strokeStyle = '#E84855'; // Red
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        for (let i = 0; i < 6; i++) {
            const neighbor = this.getHex(cell.col + dirOffsets[i].dc, cell.row + dirOffsets[i].dr);
            if (!neighbor) {
                const v1 = vertices[edges[i][0]];
                const v2 = vertices[edges[i][1]];
                ctx.beginPath();
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
                ctx.stroke();
            }
        }

        if (!cell.isRevealed) {
            ctx.fillStyle = 'rgba(180,180,200,0.85)';
            ctx.fill();
        }

        // Error Feedback (red X) - Smaller size
        if (cell.isError) {
            const size = this.sideLength * 0.2;
            ctx.strokeStyle = '#E84855';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(x + this.hexRadius - size, y + this.hexHeight + this.sideLength / 2 - size);
            ctx.lineTo(x + this.hexRadius + size, y + this.hexHeight + this.sideLength / 2 + size);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x + this.hexRadius + size, y + this.hexHeight + this.sideLength / 2 - size);
            ctx.lineTo(x + this.hexRadius - size, y + this.hexHeight + this.sideLength / 2 + size);
            ctx.stroke();
        }
    }

    draw(ctx, viewOffset = { x: 0, y: 0 }) {
        // Draw normal cells first
        const highlighted = [];
        for (const cell of this.cells.values()) {
            if (cell.isHighlighted) {
                highlighted.push(cell);
            } else {
                this.drawHex(ctx, cell, viewOffset);
            }
        }
        // Draw highlighted cells on top to avoid border clipping
        for (const cell of highlighted) {
            this.drawHex(ctx, cell, viewOffset);
        }
    }

    getCanvasDimensions() {
        // Calculate based on last hex position
        const lastCol = this.cols - 1;
        const lastRow = this.rows - 1;
        const pos = this._getHexPosition(lastCol, lastRow);

        return {
            width: Math.ceil(pos.x + this.hexRectangleWidth + this.padding),
            height: Math.ceil(pos.y + this.hexRectangleHeight + this.padding)
        };
    }

    getAllCells() {
        return Array.from(this.cells.values());
    }

    reset() {
        for (const cell of this.cells.values()) {
            cell.elevation = 0;
            cell.isRuin = false;
            cell.isRevealed = true;
            cell.isHighlighted = false;
        }
    }

    createValley(col, row, depth = -2) {
        const center = this.getHex(col, row);
        if (center) center.elevation = depth;

        for (const n of this.getNeighbors(col, row)) {
            if (!n.isRuin) n.elevation = Math.min(n.elevation, depth + 1);
        }
    }
}

window.HexGrid = HexGrid;
window.HexCell = HexCell;
