/**
 * Ball - Physics simulation for the ball rolling on the continuous landscape
 * 
 * The ball represents "system state" and moves according to the elevation
 * gradient of the terrain.
 */

class Ball {
    // Physics constants
    static GRAVITY = 0.5;           // Force multiplier for gradient (tuned for smooth terrain)
    static FRICTION = 0.96;         // Velocity decay per frame (less friction for rolling)
    static MAX_VELOCITY = 10;       // Speed limit
    static NOISE_SCALE = 0.5;       // Random perturbation multiplier
    static TRAIL_LENGTH = 100;      // Number of positions to remember

    /**
     * @param {Terrain} terrain - The terrain the ball moves on
     * @param {number} startX - Starting pixel X
     * @param {number} startY - Starting pixel Y
     */
    constructor(terrain, startX, startY) {
        this.grid = terrain; // Keeping property name 'grid' -> 'terrain' might be better but 'grid' breaks less code for now? 
        // Let's rename to 'terrain' to be clean, and fix callsites later.
        this.terrain = terrain;

        this.x = startX;
        this.y = startY;
        this.vx = 0;
        this.vy = 0;

        // Visual properties
        this.radius = 12;
        this.color = '#4A90D9';
        this.trailColor = 'rgba(74, 144, 217, 0.3)';

        // Position history
        this.trail = [];
        this.positionHistory = [];
        this.historyMaxLength = 120;

        // State
        this.isInRuin = false;
        this.noiseLevel = 0;

        // Metrics
        this.oscillationAmplitude = 0;
        this.recoveryRate = 1;

        // Recovery tracking
        this.lastPerturbationTime = 0;
        this.equilibriumPosition = { x: startX, y: startY };
        this.distanceFromEquilibrium = 0;
        this.shimmerEnergy = 0; // Visual "vibration" energy [0...1]
    }

    /**
     * Update ball physics for one frame
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt = 16.67) {
        if (this.isInRuin) return;

        // Discrete mode (used by Act 1 with HexGrid) doesn't use physics update
        if (this.isDiscreteMode) return;

        // Guard: Ensure terrain has required methods (Terrain vs HexGrid)
        if (!this.terrain || typeof this.terrain.getGradientAt !== 'function') return;

        const timeScale = dt / 16.67;

        // 1. Get Gradient (Gravity) from Terrain
        // The gradient vector points DOWNHILL
        const gradient = this.terrain.getGradientAt(this.x, this.y);

        this.vx += gradient.x * Ball.GRAVITY * timeScale;
        this.vy += gradient.y * Ball.GRAVITY * timeScale;

        // 2. Apply Noise
        if (this.noiseLevel > 0) {
            this._applyNoise(timeScale);
        }

        // 3. Apply Friction
        this.vx *= Math.pow(Ball.FRICTION, timeScale);
        this.vy *= Math.pow(Ball.FRICTION, timeScale);

        // 4. Clamp Velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > Ball.MAX_VELOCITY) {
            const scale = Ball.MAX_VELOCITY / speed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // 5. Update Position
        let nextX = this.x + this.vx * timeScale;
        let nextY = this.y + this.vy * timeScale;

        // 6. Boundary collision (Canvas edges)
        // Simple bounce
        const w = this.terrain.width;
        const h = this.terrain.height;
        const r = this.radius;

        if (nextX < r) { nextX = r; this.vx *= -0.5; }
        if (nextX > w - r) { nextX = w - r; this.vx *= -0.5; }
        if (nextY < r) { nextY = r; this.vy *= -0.5; }
        if (nextY > h - r) { nextY = h - r; this.vy *= -0.5; }

        this.x = nextX;
        this.y = nextY;

        // 7. Update Trail, Metrics & Shimmer
        this._updateTrail();
        this._updateMetrics();

        // Decay shimmer
        if (this.shimmerEnergy > 0) {
            this.shimmerEnergy -= 0.05 * timeScale;
            if (this.shimmerEnergy < 0) this.shimmerEnergy = 0;
        }
    }

    /**
     * Apply random perturbation
     */
    _applyNoise(timeScale) {
        if (Math.random() < this.noiseLevel * 0.1) {
            const angle = Math.random() * Math.PI * 2;
            const magnitude = this.noiseLevel * Ball.NOISE_SCALE * (0.5 + Math.random() * 0.5);
            this.vx += Math.cos(angle) * magnitude * 5;
            this.vy += Math.sin(angle) * magnitude * 5;
            this.lastPerturbationTime = Date.now();
            this.shimmerEnergy = 1.0; // Trigger vibration pulse
        }
    }

    /**
     * Update position trail
     */
    _updateTrail() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > Ball.TRAIL_LENGTH) {
            this.trail.shift();
        }

        this.positionHistory.push({ x: this.x, y: this.y, time: Date.now() });
        if (this.positionHistory.length > this.historyMaxLength) {
            this.positionHistory.shift();
        }
    }

    /**
     * Update oscillation metrics
     */
    _updateMetrics() {
        if (this.positionHistory.length < 30) return;

        // Variance / Amplitude
        let meanX = 0, meanY = 0;
        const recent = this.positionHistory.slice(-30);
        for (const p of recent) { meanX += p.x; meanY += p.y; }
        meanX /= recent.length;
        meanY /= recent.length;

        let variance = 0;
        for (const p of recent) {
            const dx = p.x - meanX;
            const dy = p.y - meanY;
            variance += dx * dx + dy * dy;
        }
        variance /= recent.length;
        this.oscillationAmplitude = Math.min(1, Math.sqrt(variance) / 50);

        // Recovery Rate
        // If speed is high, we are not "recovering" to a point effectively?
        // Actually, recovery rate concept works better with discrete perturbations.
        // For continuous, we can use speed as an inverse proxy for stability if we assume a depression.
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.recoveryRate = Math.max(0, 1 - (speed / (Ball.MAX_VELOCITY * 0.5)));

        // Distance from Equilibrium
        this.distanceFromEquilibrium = Math.sqrt(
            Math.pow(this.x - this.equilibriumPosition.x, 2) +
            Math.pow(this.y - this.equilibriumPosition.y, 2)
        );
    }

    setEquilibrium() {
        this.equilibriumPosition = { x: this.x, y: this.y };
    }

    applyImpulse(fx, fy) {
        this.vx += fx;
        this.vy += fy;
        this.lastPerturbationTime = Date.now();
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.trail = [];
        this.positionHistory = [];
    }

    /**
     * Draw the ball
     * @param {CanvasRenderingContext2D} ctx
     * @param {boolean} showTrail
     * @param {Object} viewOffset - Optional camera offset { x, y }
     */
    draw(ctx, showTrail = true, viewOffset = { x: 0, y: 0 }) {
        // Calculate draw positions with camera offset
        const drawX = this.x - viewOffset.x;
        const drawY = this.y - viewOffset.y;

        // Draw Trail
        if (showTrail && this.trail.length > 1) {
            for (let i = 0; i < this.trail.length; i++) {
                const alpha = (i / this.trail.length) * 0.3;
                const size = this.radius * 0.3 * (i / this.trail.length);
                const p = this.trail[i];
                const trailX = p.x - viewOffset.x;
                const trailY = p.y - viewOffset.y;
                ctx.beginPath();
                ctx.arc(trailX, trailY, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(74, 144, 217, ${alpha})`;
                ctx.fill();
            }
        }

        // 1. Draw Vibration (Micro-noise shimmer pulse)
        if (this.shimmerEnergy > 0) {
            const numRings = 3;
            // Jitter and alpha tied to shimmerEnergy
            const jitterScale = this.noiseLevel * 15 * this.shimmerEnergy;

            ctx.save();
            for (let i = 0; i < numRings; i++) {
                const offsetX = (Math.random() - 0.5) * jitterScale;
                const offsetY = (Math.random() - 0.5) * jitterScale;
                const alpha = this.shimmerEnergy * (0.3 + Math.random() * 0.3);

                ctx.beginPath();
                const r = this.radius + 2 + (i * 2) + (Math.random() * 2);
                ctx.arc(drawX + offsetX, drawY + offsetY, r, 0, Math.PI * 2);

                ctx.strokeStyle = `rgba(180, 210, 255, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.restore();
        }

        // 2. Draw Shadow
        ctx.beginPath();
        ctx.arc(drawX + 3, drawY + 3, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Draw Ball
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(drawX - 4, drawY - 4, 0, drawX, drawY, this.radius);
        grad.addColorStop(0, '#6BA8E5');
        grad.addColorStop(1, '#3A7BC8');
        ctx.fillStyle = grad;
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.arc(drawX - 4, drawY - 4, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();

        if (this.isInRuin) {
            // ... ruin overlay ...
        }
    }

    // ============================================
    // Discrete Movement Methods (for Act 1 HexGrid)
    // ============================================

    /**
     * Check if ball is currently animating a discrete move
     */
    isMovingDiscrete() {
        return this._isMovingDiscrete || false;
    }

    /**
     * Animate ball to a specific hex cell (discrete movement for Act 1)
     * @param {number} col - Target column
     * @param {number} row - Target row
     * @param {number} duration - Animation duration in ms
     */
    moveTo(col, row, duration = 300) {
        if (!this.grid || typeof this.grid.hexToPixel !== 'function') return;

        const targetPos = this.grid.hexToPixel(col, row);
        const startX = this.x;
        const startY = this.y;
        const startTime = performance.now();

        this._isMovingDiscrete = true;
        this._targetCol = col;
        this._targetRow = row;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(1, elapsed / duration);

            // Ease-out cubic
            const ease = 1 - Math.pow(1 - t, 3);

            this.x = startX + (targetPos.x - startX) * ease;
            this.y = startY + (targetPos.y - startY) * ease;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.x = targetPos.x;
                this.y = targetPos.y;
                this._isMovingDiscrete = false;
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Get the hex cell the ball is currently on (for Act 1)
     * @returns {Object|null} The hex cell or null
     */
    getCurrentHex() {
        if (!this.grid || typeof this.grid.getHexAtPixel !== 'function') return null;
        return this.grid.getHexAtPixel(this.x, this.y);
    }

    /**
     * Reset the ball to a specific grid position (for Act 1)
     * @param {number} col 
     * @param {number} row 
     */
    reset(col, row) {
        if (!this.grid || typeof this.grid.hexToPixel !== 'function') return;
        const pos = this.grid.hexToPixel(col, row);
        this.x = pos.x;
        this.y = pos.y;
        this.vx = 0;
        this.vy = 0;
        this.trail = [];
        this.positionHistory = [];
        this.isInRuin = false;
        this._isMovingDiscrete = false;
    }
}
window.Ball = Ball;
