/**
 * Ball - Physics simulation for the ball rolling on the hex landscape
 * 
 * The ball represents "system state" and moves according to the elevation
 * gradient of the hexagonal landscape. It rolls downhill toward lower
 * hexagons with momentum and friction.
 * 
 * Key behaviors:
 * - Moves toward lowest adjacent areas (potential field physics)
 * - Has momentum that decays over time (friction)
 * - Can receive random "noise" perturbations (for N-tipping demos)
 * - Tracks oscillation amplitude and recovery time (for early warning signals)
 */

class Ball {
    // Physics constants
    static GRAVITY = 0.15;          // Force multiplier for gradient
    static FRICTION = 0.92;         // Velocity decay per frame
    static MAX_VELOCITY = 8;        // Speed limit
    static NOISE_SCALE = 0.5;       // Random perturbation multiplier
    static TRAIL_LENGTH = 60;       // Number of positions to remember

    /**
     * @param {HexGrid} grid - The hex grid the ball moves on
     * @param {number} startQ - Starting hex q coordinate
     * @param {number} startR - Starting hex r coordinate
     */
    constructor(grid, startQ, startR) {
        this.grid = grid;

        // Get pixel position from hex coordinates
        const startPos = grid.hexToPixel(startQ, startR);

        this.x = startPos.x;
        this.y = startPos.y;
        this.vx = 0;
        this.vy = 0;

        // Visual properties
        this.radius = 12;
        this.color = '#4A90D9';
        this.trailColor = 'rgba(74, 144, 217, 0.3)';

        // Position history for trail and wobble detection
        this.trail = [];
        this.positionHistory = [];
        this.historyMaxLength = 120; // 2 seconds at 60fps

        // State
        this.isInRuin = false;
        this.noiseLevel = 0; // 0 to 1

        // Metrics for early warning signals
        this.oscillationAmplitude = 0;
        this.recoveryRate = 1; // 1 = fast recovery, 0 = slow (critical slowing)

        // For recovery rate calculation
        this.lastPerturbationTime = 0;
        this.equilibriumPosition = { x: startPos.x, y: startPos.y };
        this.distanceFromEquilibrium = 0;

        // Discrete movement properties (for Act 1 redesign)
        this.isDiscreteMode = false;
        this.targetX = null;
        this.targetY = null;
        this.moveDuration = 300; // ms for one step
        this.moveStartTime = 0;
        this.sourceX = 0;
        this.sourceY = 0;
    }

    /**
     * Update ball physics for one frame
     * @param {number} dt - Delta time in milliseconds (typically ~16.67)
     */
    update(dt = 16.67) {
        if (this.isInRuin) return;

        if (this.isDiscreteMode) {
            this._updateDiscrete(dt);
            this._updateTrail();
            this._updateMetrics();
            return;
        }

        // Normalize dt to frames (assuming 60fps target)
        const timeScale = dt / 16.67;

        // Get current hex
        const currentHex = this.grid.getHexAtPixel(this.x, this.y);

        if (!currentHex) {
            // Ball is outside grid - apply centering force
            this._applyCenteringForce();
        } else {
            // Check for ruin
            if (currentHex.isRuin) {
                this.isInRuin = true;
                return;
            }

            // Calculate gradient force (rolls downhill)
            const gradient = this.grid.calculateGradient(currentHex.col, currentHex.row);

            // Apply gravity along gradient
            this.vx += gradient.x * Ball.GRAVITY * timeScale;
            this.vy += gradient.y * Ball.GRAVITY * timeScale;

            // Apply hex centering force (to settle in center of tiles)
            // Only apply if moving slowly, to allow natural rolls on slopes
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed < 1.5) {
                const centering = this.grid.getCenteringForce(currentHex.col, currentHex.row, this.x, this.y);
                this.vx += centering.x * 2.0 * timeScale;
                this.vy += centering.y * 2.0 * timeScale;
            }
        }

        // Apply random noise (for N-tipping simulations)
        if (this.noiseLevel > 0) {
            this._applyNoise(timeScale);
        }

        // Apply friction
        this.vx *= Math.pow(Ball.FRICTION, timeScale);
        this.vy *= Math.pow(Ball.FRICTION, timeScale);

        // Clamp velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > Ball.MAX_VELOCITY) {
            const scale = Ball.MAX_VELOCITY / speed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // Update position
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;

        // Update trail
        this._updateTrail();

        // Update metrics
        this._updateMetrics();
    }

    /**
     * Handle discrete linear movement
     */
    _updateDiscrete(dt) {
        if (this.targetX === null || this.targetY === null) return;

        const now = Date.now();
        const elapsed = now - this.moveStartTime;
        const t = Math.min(1, elapsed / this.moveDuration);

        // Simple ease-in-out
        const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        this.x = this.sourceX + (this.targetX - this.sourceX) * easedT;
        this.y = this.sourceY + (this.targetY - this.sourceY) * easedT;

        if (t >= 1) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.targetX = null;
            this.targetY = null;
            this.vx = 0;
            this.vy = 0;
        }
    }

    /**
     * Move smoothly to a specific hex center
     */
    moveTo(col, row, duration = 300) {
        const pos = this.grid.hexToPixel(col, row);
        this.sourceX = this.x;
        this.sourceY = this.y;
        this.targetX = pos.x;
        this.targetY = pos.y;
        this.moveDuration = duration;
        this.moveStartTime = Date.now();
        this.isMoving = true;
    }

    /**
     * Is the ball currently moving in discrete mode?
     */
    isMovingDiscrete() {
        return this.targetX !== null;
    }

    /**
     * Apply random perturbation based on noise level
     */
    _applyNoise(timeScale) {
        // Chance of a perturbation depends on noise level
        if (Math.random() < this.noiseLevel * 0.1) {
            const angle = Math.random() * Math.PI * 2;
            const magnitude = this.noiseLevel * Ball.NOISE_SCALE * (0.5 + Math.random() * 0.5);

            this.vx += Math.cos(angle) * magnitude * 10;
            this.vy += Math.sin(angle) * magnitude * 10;

            this.lastPerturbationTime = Date.now();
        }
    }

    /**
     * Apply force to keep ball on grid
     */
    _applyCenteringForce() {
        // Get center of grid
        const dims = this.grid.getCanvasDimensions();
        const centerX = dims.width / 2;
        const centerY = dims.height / 2;

        const dx = centerX - this.x;
        const dy = centerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.vx += (dx / dist) * 0.5;
            this.vy += (dy / dist) * 0.5;
        }
    }

    /**
     * Update position trail for visual effect
     */
    _updateTrail() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > Ball.TRAIL_LENGTH) {
            this.trail.shift();
        }

        // Also update position history for metrics
        this.positionHistory.push({
            x: this.x,
            y: this.y,
            time: Date.now()
        });
        if (this.positionHistory.length > this.historyMaxLength) {
            this.positionHistory.shift();
        }
    }

    /**
     * Update oscillation and recovery metrics
     * These are the "early warning signals" for tipping
     */
    _updateMetrics() {
        if (this.positionHistory.length < 30) return;

        // Calculate oscillation amplitude (variance of position)
        const recentPositions = this.positionHistory.slice(-30);

        // Find mean position
        let meanX = 0, meanY = 0;
        for (const pos of recentPositions) {
            meanX += pos.x;
            meanY += pos.y;
        }
        meanX /= recentPositions.length;
        meanY /= recentPositions.length;

        // Calculate variance (oscillation amplitude)
        let variance = 0;
        for (const pos of recentPositions) {
            const dx = pos.x - meanX;
            const dy = pos.y - meanY;
            variance += dx * dx + dy * dy;
        }
        variance /= recentPositions.length;

        // Normalize to 0-1 range (assuming max variance of ~2500)
        this.oscillationAmplitude = Math.min(1, Math.sqrt(variance) / 50);

        // Calculate recovery rate (autocorrelation / return time)
        // Higher values = faster recovery = more stable
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        // If ball is nearly stationary, recovery is fast
        // If ball keeps moving, recovery is slow (critical slowing down)
        this.recoveryRate = Math.max(0, 1 - (currentSpeed / Ball.MAX_VELOCITY));

        // Smooth the metrics
        this.distanceFromEquilibrium = Math.sqrt(
            Math.pow(this.x - this.equilibriumPosition.x, 2) +
            Math.pow(this.y - this.equilibriumPosition.y, 2)
        );
    }

    /**
     * Set the equilibrium position (for recovery tracking)
     */
    setEquilibrium() {
        this.equilibriumPosition = { x: this.x, y: this.y };
    }

    /**
     * Apply a manual impulse to the ball
     */
    applyImpulse(fx, fy) {
        this.vx += fx;
        this.vy += fy;
        this.lastPerturbationTime = Date.now();
    }

    /**
     * Set the ball's position directly
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.trail = [];
        this.positionHistory = [];
    }

    /**
     * Move ball to a specific hex
     */
    moveToHex(q, r) {
        const pos = this.grid.hexToPixel(q, r);
        this.setPosition(pos.x, pos.y);
        this.setEquilibrium();
    }

    /**
     * Get the hex the ball is currently over
     */
    getCurrentHex() {
        return this.grid.getHexAtPixel(this.x, this.y);
    }

    /**
     * Check if ball is settled (low velocity)
     */
    isSettled(threshold = 0.5) {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        return speed < threshold;
    }

    /**
     * Draw the ball with optional trail
     */
    draw(ctx, showTrail = true, viewOffset = { x: 0, y: 0 }) {
        const x = this.x - viewOffset.x;
        const y = this.y - viewOffset.y;

        // Draw trail
        if (showTrail && this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x - viewOffset.x, this.trail[0].y - viewOffset.y);

            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x - viewOffset.x, this.trail[i].y - viewOffset.y);
            }

            ctx.strokeStyle = this.trailColor;
            ctx.lineWidth = this.radius * 0.6;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Fade effect - draw circles with decreasing opacity
            for (let i = 0; i < this.trail.length; i++) {
                const alpha = (i / this.trail.length) * 0.3;
                const size = this.radius * 0.3 * (i / this.trail.length);

                ctx.beginPath();
                ctx.arc(this.trail[i].x - viewOffset.x, this.trail[i].y - viewOffset.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(74, 144, 217, ${alpha})`;
                ctx.fill();
            }
        }

        // Draw ball shadow
        ctx.beginPath();
        ctx.arc(x + 3, y + 3, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Draw ball
        const gradient = ctx.createRadialGradient(
            x - this.radius * 0.3,
            y - this.radius * 0.3,
            0,
            x,
            y,
            this.radius
        );
        gradient.addColorStop(0, '#6BA8E5');
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, '#3A7BC8');

        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.arc(
            x - this.radius * 0.3,
            y - this.radius * 0.3,
            this.radius * 0.25,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        // Ruin state overlay
        if (this.isInRuin) {
            ctx.beginPath();
            ctx.arc(x, y, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#E84855';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // X mark
            ctx.strokeStyle = '#E84855';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 8, y - 8);
            ctx.lineTo(x + 8, y + 8);
            ctx.moveTo(x + 8, y - 8);
            ctx.lineTo(x - 8, y + 8);
            ctx.stroke();
        }
    }

    /**
     * Get wobble metrics for UI display
     */
    getWobbleMetrics() {
        return {
            oscillation: this.oscillationAmplitude,
            recovery: this.recoveryRate,
            speed: Math.sqrt(this.vx * this.vx + this.vy * this.vy),
            distanceFromEquilibrium: this.distanceFromEquilibrium
        };
    }

    /**
     * Reset ball state
     */
    reset(q, r) {
        const pos = this.grid.hexToPixel(q, r);
        this.x = pos.x;
        this.y = pos.y;
        this.vx = 0;
        this.vy = 0;
        this.trail = [];
        this.positionHistory = [];
        this.isInRuin = false;
        this.noiseLevel = 0;
        this.oscillationAmplitude = 0;
        this.recoveryRate = 1;
        this.equilibriumPosition = { x: pos.x, y: pos.y };
    }
}

// Export for use in other modules
window.Ball = Ball;
