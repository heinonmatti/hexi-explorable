/**
 * Terrain.js
 * Represents a continuous 2D heightmap for the Resilience Landscapes explorable.
 * Replaces the discrete HexGrid system.
 */

class Terrain {
    constructor(width, height, resolution = 64) {
        this.width = width;
        this.height = height;
        this.resolution = resolution;

        // Grid cell size in pixels
        this.scaleX = width / (resolution - 1);
        this.scaleY = height / (resolution - 1);

        // Noise generator
        this.perlin = window.Perlin ? new window.Perlin() : null;

        // 2D Heightmap (Float32Array for performance, flat array)
        // Access: index = y * resolution + x
        this.heights = new Float32Array(resolution * resolution).fill(0);

        // Base colors for hypsometric tinting (Abstract Potential Landscape)
        this.colors = {
            valleyDeep: [30, 60, 30],    // Dark Green/Black (Low potential)
            valley: [60, 100, 60],       // Medium Green
            plain: [120, 160, 120],      // Light Green (Neutral)
            slope: [180, 160, 120],      // Tan/Brown
            peak: [220, 220, 220],       // Light Grey
            snow: [255, 255, 255]        // White
        };
    }

    /**
     * Get height at a specific grid index
     */
    getGridHeight(gx, gy) {
        if (gx < 0 || gx >= this.resolution || gy < 0 || gy >= this.resolution) return 0;
        return this.heights[gy * this.resolution + gx];
    }

    /**
     * Set height at a specific grid index
     */
    setGridHeight(gx, gy, val) {
        if (gx < 0 || gx >= this.resolution || gy < 0 || gy >= this.resolution) return;
        this.heights[gy * this.resolution + gx] = val;
    }

    /**
     * Get smooth height at any pixel coordinate using bilinear interpolation
     */
    getHeightAt(x, y) {
        // Normalize to grid coordinates
        const gx = x / this.scaleX;
        const gy = y / this.scaleY;

        // Integer parts
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const x1 = Math.min(x0 + 1, this.resolution - 1);
        const y1 = Math.min(y0 + 1, this.resolution - 1);

        // Fractional parts
        const tx = gx - x0;
        const ty = gy - y0;

        // 4 corner heights
        const h00 = this.getGridHeight(x0, y0);
        const h10 = this.getGridHeight(x1, y0);
        const h01 = this.getGridHeight(x0, y1);
        const h11 = this.getGridHeight(x1, y1);

        // Bilinear interpolation
        const h0 = h00 * (1 - tx) + h10 * tx;
        const h1 = h01 * (1 - tx) + h11 * tx;
        return h0 * (1 - ty) + h1 * ty;
    }

    /**
     * Calculate gradient (slope) at pixel coordinates
     * Returns {x, y} vector pointing DOWNHILL (as per typical gravity needs)
     */
    getGradientAt(x, y) {
        const epsilon = 1.0; // Pixel step for finite difference

        // Central difference
        const hL = this.getHeightAt(x - epsilon, y);
        const hR = this.getHeightAt(x + epsilon, y);
        const hU = this.getHeightAt(x, y - epsilon);
        const hD = this.getHeightAt(x, y + epsilon);

        // Gradient vector (pointing uphill)
        const dx = (hR - hL) / (2 * epsilon);
        const dy = (hD - hU) / (2 * epsilon);

        // Gravity pulls DOWNHILL, so we return negative gradient
        return { x: -dx, y: -dy };
    }

    /**
     * Modify terrain height with a Gaussian brush
     * Implements directional propagation as requested:
     * - Raising spills to lower neighbors
     * - Lowering pulls from higher neighbors
     */
    raise(pixelX, pixelY, amount, radius) {
        const centerGx = Math.round(pixelX / this.scaleX);
        const centerGy = Math.round(pixelY / this.scaleY);
        const radGrid = Math.ceil(radius / Math.min(this.scaleX, this.scaleY));

        // 1. Apply primary change with Noise Modulation
        // Random offset for this click to ensure different shapes
        const noiseOffsetX = Math.random() * 1000;
        const noiseOffsetY = Math.random() * 1000;
        const noiseScale = 0.15; // Frequency of the brush "jagginess"

        for (let dy = -radGrid - 5; dy <= radGrid + 5; dy++) {
            for (let dx = -radGrid - 5; dx <= radGrid + 5; dx++) {
                const gx = centerGx + dx;
                const gy = centerGy + dy;

                if (gx < 0 || gx >= this.resolution || gy < 0 || gy >= this.resolution) continue;

                // Noise-perturbed distance
                // We use noise to vary the "effective radius" at different angles
                let n = this.perlin ? this.perlin.noise((gx + noiseOffsetX) * noiseScale, (gy + noiseOffsetY) * noiseScale, 0) : 0;

                // radiusPerturbation makes the perimeter jagged
                const radiusPerturbation = 1.0 + n * 0.4;
                const distSq = dx * dx + dy * dy;
                const effectiveRadiusSq = (radGrid * radiusPerturbation) * (radGrid * radiusPerturbation);

                if (distSq <= effectiveRadiusSq) {
                    // Gaussian falloff modulated by noise intensity
                    const falloff = Math.exp(-distSq / (radGrid * radGrid * 0.5));

                    // Modulate the height change intensity slightly with noise too
                    const intensityMod = 0.8 + (n + 1) * 0.2;
                    const change = amount * falloff * intensityMod;

                    const oldH = this.getGridHeight(gx, gy);
                    // Hard clamp between -4.2 and 4.2 (slightly beyond visual for buffer)
                    const newH = Math.max(-4.2, Math.min(4.2, oldH + change));
                    this.setGridHeight(gx, gy, newH);
                }
            }
        }

        // 2. Directional Propagation (Cellular automata pass)
        // "Spill over" logic
        if (Math.abs(amount) > 0.1) {
            this._propagate(centerGx, centerGy, radGrid + 2, amount > 0);
        }
    }

    /**
     * Propagate changes to neighboring cells
     * @param {number} cx Center X grid
     * @param {number} cy Center Y grid
     * @param {number} range Range of propagation
     * @param {boolean} isRaising True if we are raising (fill valleys), false if lowering (undermine peaks)
     */
    /**
     * Apply a simple 3x3 box blur to smooth the terrain
     * distinct from propagation, this is for initial generation polish
     */
    smooth() {
        const newHeights = new Float32Array(this.heights.length);
        const w = this.resolution;

        for (let y = 0; y < w; y++) {
            for (let x = 0; x < w; x++) {
                let sum = 0;
                let count = 0;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;

                        if (nx >= 0 && nx < w && ny >= 0 && ny < w) {
                            sum += this.heights[ny * w + nx];
                            count++;
                        }
                    }
                }
                newHeights[y * w + x] = sum / count;
            }
        }
        this.heights = newHeights;
    }

    /**
     * Add additive noise to the entire terrain
     * Useful for recovering texture after large smooth operations
     */
    addNoise(amplitude = 0.2, frequency = 20.0) {
        if (!this.perlin) return;

        for (let y = 0; y < this.resolution; y++) {
            for (let x = 0; x < this.resolution; x++) {
                const u = x / this.resolution;
                const v = y / this.resolution;

                const n = this.perlin.noise(u * frequency, v * frequency, Math.random() * 10);

                // Add noise, but clamp to safe limits
                const idx = y * this.resolution + x;
                this.heights[idx] += n * amplitude;
            }
        }
    }

    /**
     * Generate fractal terrain using Perlin Noise
     * Replaces the flat initialization for a more organic base
     */
    generateFractal() {
        if (!this.perlin) return;

        // Multi-scale noise
        // We want the noise to cover roughly the same "area" regardless of resolution
        // Previous at res 80: x * 0.05 -> domain 0..4
        // New: x / resolution * 4.0
        const frequency = 4.0;

        for (let y = 0; y < this.resolution; y++) {
            for (let x = 0; x < this.resolution; x++) {
                // Determine position in "noise space" 0..1
                const u = x / this.resolution;
                const v = y / this.resolution;

                // Adjust for aspect ratio if needed, but square grid assumption is fine for noise
                const nx = u * frequency;
                const ny = v * frequency; // * (this.height / this.width) if strictly keeping aspect

                // Base noise: -1 to 1 roughly
                let n = this.perlin.fbm(nx, ny, 6, 0.5); // Increase octaves for more HD detail

                // Map to height range (-3 to +3 mostly)
                this.heights[y * this.resolution + x] = n * 4.0;
            }
        }
    }

    _propagate(cx, cy, range, isRaising) {
        // Iterate over the affected area + buffer
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const x = cx + dx;
                const y = cy + dy;

                if (x < 1 || x >= this.resolution - 1 || y < 1 || y >= this.resolution - 1) continue;

                const h = this.getGridHeight(x, y);

                // Check 4 neighbors
                const neighbors = [
                    { x: x + 1, y: y }, { x: x - 1, y: y },
                    { x: x, y: y + 1 }, { x: x, y: y - 1 }
                ];

                for (const n of neighbors) {
                    const hN = this.getGridHeight(n.x, n.y);
                    const diff = h - hN; // Positive if current is higher

                    if (isRaising) {
                        // If we raised 'x,y', we might spill into 'n' if 'n' is significantly lower
                        // "when click results in a piece of land raising above the neighbouring land, 
                        // some of the raise should go into those lower neighbouring areas"
                        if (diff > 0.5) { // Threshold for spill
                            // Move some mass from high to low? Or just raise low?
                            // Request implies "some of the raise should go into", implying additional raise
                            this.setGridHeight(n.x, n.y, hN + diff * 0.1);
                        }
                    } else {
                        // If we lowered 'x,y', we might undermine 'n' if 'n' is significantly higher
                        // "some de-elevation... should propagate to the higher areas"
                        if (hN > h + 0.5) {
                            this.setGridHeight(n.x, n.y, hN - (hN - h) * 0.1);
                        }
                    }
                }
            }
        }
    }

    /**
     * Draw the terrain with Hillshading and Hypsometric Tints
     * Emulating a 'rayshader' style look
     */
    draw(ctx) {
        if (!this._offscreen) {
            this._offscreen = document.createElement('canvas');
            this._offscreen.width = this.resolution;
            this._offscreen.height = this.resolution;
            this._osCtx = this._offscreen.getContext('2d');
            this._imgData = this._osCtx.createImageData(this.resolution, this.resolution);
        }

        const data = this._imgData.data;

        // Lighting parameters for Hillshading
        // Light coming from North-West (Top-Left)
        const sunAzimuth = 315 * (Math.PI / 180);
        const sunElevation = 45 * (Math.PI / 180);

        // Light vector (normalized)
        const lx = Math.sin(sunAzimuth) * Math.cos(sunElevation);
        const ly = Math.cos(sunAzimuth) * Math.cos(sunElevation);
        const lz = Math.sin(sunElevation);

        for (let gy = 0; gy < this.resolution; gy++) {
            for (let gx = 0; gx < this.resolution; gx++) {
                const h = this.getGridHeight(gx, gy);

                // 1. Calculate Surface Normal
                // Use gradient to find normal vector [-dz/dx, -dz/dy, 1]
                const grad = this.getGradientAt(gx * this.scaleX, gy * this.scaleY);
                // Note: getGradientAt returns "downhill" vector (gravity), so slope is opposite
                // Slope vector = [1, 0, dz/dx] and [0, 1, dz/dy]
                // Normal is roughly [-grad.x, -grad.y, 1], normalized

                // Need to scale gradient by 'z-factor' vs pixel scale
                const zFactor = 0.5; // Exaggerate height for shading
                const nx = grad.x * zFactor; // Gradient was negative downhill, so this is effectively slope
                const ny = grad.y * zFactor;
                const nz = 1.0;

                // Normalize normal
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                const nX = nx / len;
                const nY = ny / len;
                const nZ = nz / len;

                // 2. Calculate Hillshade (Lambertian + Ambient)
                // Dot product of Normal and Light
                const dot = nX * lx + nY * ly + nZ * lz;
                // Remap -1..1 to 0..1 for shading intensity
                // Standard hillshade is mostly 0.5...1.0
                let intensity = Math.max(0, dot);

                // Add some ambient light
                intensity = 0.5 + 0.5 * intensity;

                // 3. Get Base Color (Hypsometric Tint)
                const baseColor = this._getColorForHeight(h);

                const idx = (gy * this.resolution + gx) * 4;

                // Apply shading
                data[idx] = baseColor[0] * intensity;
                data[idx + 1] = baseColor[1] * intensity;
                data[idx + 2] = baseColor[2] * intensity;
                data[idx + 3] = 255;
            }
        }

        this._osCtx.putImageData(this._imgData, 0, 0);

        ctx.save();
        ctx.imageSmoothingEnabled = true; // Linear interpolation for smoothness
        ctx.drawImage(this._offscreen, 0, 0, this.width, this.height);
        ctx.restore();
    }

    _getColorForHeight(h) {
        // Clamp height to match logical limits
        h = Math.max(-4, Math.min(4.5, h)); // Allow slight overshoot for snow

        // Ramping for potential landscape (scaled to ±4.0)
        // -4 (Deep Valley) -> 0 (Plain) -> +4 (Peak)

        if (h < -2) return this._lerpColor(this.colors.valleyDeep, this.colors.valley, (h + 4) / 2);
        if (h < 0) return this._lerpColor(this.colors.valley, this.colors.plain, (h + 2) / 2);
        if (h < 1.5) return this._lerpColor(this.colors.plain, this.colors.slope, h / 1.5);
        if (h < 3.5) return this._lerpColor(this.colors.slope, this.colors.peak, (h - 1.5) / 2.0);

        // Snow transition (softer)
        if (h < 4.5) return this._lerpColor(this.colors.peak, this.colors.snow, (h - 3.5));

        return this.colors.snow;
    }

    _lerpColor(c1, c2, t) {
        t = Math.max(0, Math.min(1, t));
        // Use quadratic ease-in-out for smoother gradients? 
        // Or just keep linear but with better stops. 
        // Keeping linear for predictability but higher rez helps.
        return [
            Math.round(c1[0] + (c2[0] - c1[0]) * t),
            Math.round(c1[1] + (c2[1] - c1[1]) * t),
            Math.round(c1[2] + (c2[2] - c1[2]) * t)
        ];
    }
}
