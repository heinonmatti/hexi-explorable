/**
 * Act 3: Reading the Wobble - Early Warning Signals
 * 
 * This act teaches players to recognize early warning signals of tipping:
 * - Increased oscillation amplitude (ball wobbles more)
 * - Critical slowing down (ball takes longer to return to equilibrium)
 * 
 * The landscape is hidden by fog. Players must "read the wobble" to decide
 * when to evacuate before the ball falls into ruin.
 * 
 * Scientific concept: Systems approaching tipping points often show
 * characteristic signals: increased variance and slower recovery times.
 */

class Act3Wobble {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.grid = null;
        this.ball = null;
        this.fog = null;

        // Game state
        this.score = 0;
        this.round = 1;
        this.maxRounds = 3;
        this.roundActive = false;
        this.evacuated = false;
        this.ruinReached = false;

        // Timing
        this.roundStartTime = 0;
        this.erosionInterval = null;
        this.currentErosion = 0;

        // Animation
        this.animationId = null;

        // Callbacks
        this.onRoundEnd = null;
        this.onComplete = null;
    }

    /**
     * Initialize the act
     */
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // Create grid
        const isMobile = window.innerWidth < 650;
        const hexSize = isMobile ? 55 : 40;
        this.grid = new HexGrid(7, 5, hexSize);

        // Set canvas size
        const dims = this.grid.getCanvasDimensions();
        this.canvas.width = isMobile ? Math.min(window.innerWidth - 40, dims.width) : dims.width;
        this.canvas.height = dims.height;

        // Initialize fog
        this.fog = new FogSystem(this.grid);

        // Set up first round
        this._setupRound();

        // Set up event listeners
        this._setupEventListeners();

        // Start animation
        this._startAnimation();
    }

    /**
     * Set up a new round
     */
    _setupRound() {
        // Reset grid
        this.grid.reset();

        // Create a valley that will erode
        this.grid.createValley(3, 2, -3, 1);

        // Place ruin(s)
        const ruinPositions = [
            { q: 6, r: 1 },
            { q: 0, r: 3 }
        ];

        ruinPositions.forEach(pos => {
            const hex = this.grid.getHex(pos.q, pos.r);
            if (hex) {
                this.grid.setRuin(pos.q, pos.r);
            }
        });

        // Cover grid in fog (except ball position)
        this.fog.coverAll();

        // Place ball
        const valleyCenter = this.grid.getHex(3, 2);
        if (!this.ball) {
            this.ball = new Ball(this.grid, valleyCenter.q, valleyCenter.r);
        } else {
            this.ball.reset(valleyCenter.q, valleyCenter.r);
        }
        this.ball.setEquilibrium();
        this.ball.noiseLevel = 0.1; // Low constant noise

        // Reveal only the ball's starting hex
        this.fog.reveal(valleyCenter.q, valleyCenter.r, 0);

        // Reset state
        this.evacuated = false;
        this.ruinReached = false;
        this.roundActive = true;
        this.currentErosion = 0;
        this.roundStartTime = Date.now();

        // Start gradual erosion (B-tipping happening in background)
        this._startErosion();

        // Update UI
        this._updateDisplay();
    }

    /**
     * Start the erosion process
     */
    _startErosion() {
        if (this.erosionInterval) {
            clearInterval(this.erosionInterval);
        }

        // Erode the landscape over time
        this.erosionInterval = setInterval(() => {
            if (!this.roundActive) return;

            this.currentErosion++;
            this.grid.applyErosion(0.3);

            // Add small perturbation
            this.ball.applyImpulse(
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 1
            );

        }, 2000); // Every 2 seconds
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        const evacuateBtn = document.getElementById('evacuate-btn');
        if (evacuateBtn) {
            evacuateBtn.addEventListener('click', () => {
                this._handleEvacuate();
            });
        }
    }

    /**
     * Handle evacuation decision
     */
    _handleEvacuate() {
        if (!this.roundActive || this.evacuated) return;

        this.evacuated = true;
        this.roundActive = false;

        // Stop erosion
        if (this.erosionInterval) {
            clearInterval(this.erosionInterval);
        }

        // Reveal the landscape
        this.fog.revealAll();

        // Calculate score based on timing
        const timeElapsed = Date.now() - this.roundStartTime;
        const erosionLevel = this.currentErosion;

        // Scoring logic:
        // - If evacuated when erosion is high (landscape is fragile), good timing
        // - If evacuated when erosion is low, too early
        // - The "sweet spot" is when oscillation is high but ruin hasn't happened

        let points = 0;
        let feedback = '';

        // Check proximity to actual tipping
        const currentHex = this.ball.getCurrentHex();
        const wasNearRuin = erosionLevel >= 3;

        if (wasNearRuin && !this.ball.isInRuin) {
            // Perfect timing - evacuated when close to tipping
            points = 50;
            feedback = 'Excellent timing! You read the warning signs correctly.';
        } else if (erosionLevel >= 2 && !this.ball.isInRuin) {
            // Good timing
            points = 30;
            feedback = 'Good call! The system was becoming unstable.';
        } else if (erosionLevel < 2) {
            // Too early
            points = -20;
            feedback = 'Too early. Resources wasted on a premature evacuation.';
        }

        this.score += points;
        this._updateDisplay();
        this._showRoundFeedback(feedback, points);
    }

    /**
     * Handle when ball reaches ruin
     */
    _handleRuin() {
        if (!this.roundActive) return;

        this.ruinReached = true;
        this.roundActive = false;

        // Stop erosion
        if (this.erosionInterval) {
            clearInterval(this.erosionInterval);
        }

        // Reveal the landscape
        this.fog.revealAll();

        // Penalize
        const points = -100;
        this.score += points;

        this._updateDisplay();
        this._showRoundFeedback('Too late! The system collapsed.', points);
    }

    /**
     * Show feedback for the round
     */
    _showRoundFeedback(message, points) {
        // Create feedback element if it doesn't exist
        let feedbackEl = document.querySelector('.round-feedback');
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.className = 'round-feedback';
            feedbackEl.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                text-align: center;
                z-index: 1000;
                max-width: 90%;
            `;
            document.body.appendChild(feedbackEl);
        }

        const pointsColor = points >= 0 ? '#45B7A0' : '#E84855';
        const pointsSign = points >= 0 ? '+' : '';

        feedbackEl.innerHTML = `
            <p style="margin: 0 0 1rem 0; font-size: 1.1rem;">${message}</p>
            <p style="margin: 0 0 1rem 0; font-size: 1.5rem; font-weight: bold; color: ${pointsColor};">
                ${pointsSign}${points} points
            </p>
            <button id="next-round-btn" style="
                padding: 0.75rem 2rem;
                background: #4A90D9;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                cursor: pointer;
            ">${this.round < this.maxRounds ? 'Next Round' : 'Continue'}</button>
        `;

        const nextBtn = feedbackEl.querySelector('#next-round-btn');
        nextBtn.addEventListener('click', () => {
            feedbackEl.remove();
            this._advanceRound();
        });
    }

    /**
     * Advance to next round or complete
     */
    _advanceRound() {
        if (this.round >= this.maxRounds) {
            this._completeAct();
        } else {
            this.round++;
            this._setupRound();
        }
    }

    /**
     * Complete the act
     */
    _completeAct() {
        // Show debrief
        const debriefEl = document.getElementById('act3-debrief');
        if (debriefEl) {
            debriefEl.style.display = 'block';
            debriefEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (this.onComplete) {
            this.onComplete({
                score: this.score
            });
        }
    }

    /**
     * Update the display
     */
    _updateDisplay() {
        const scoreEl = document.getElementById('act3-score');
        if (scoreEl) {
            scoreEl.textContent = this.score;
        }

        // Update wobble indicators
        if (this.ball) {
            const metrics = this.ball.getWobbleMetrics();

            const oscillationBar = document.getElementById('oscillation-bar');
            if (oscillationBar) {
                oscillationBar.style.width = `${metrics.oscillation * 100}%`;
            }

            const recoveryBar = document.getElementById('recovery-bar');
            if (recoveryBar) {
                // Invert recovery (low recovery = high danger)
                recoveryBar.style.width = `${(1 - metrics.recovery) * 100}%`;
            }
        }
    }

    /**
     * Animation loop
     */
    _startAnimation() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            this._update();
            this._draw();
        };
        animate();
    }

    /**
     * Update physics and indicators
     */
    _update() {
        if (this.ball) {
            this.ball.update();

            // Check for ruin
            if (this.roundActive && this.ball.isInRuin && !this.ruinReached) {
                this._handleRuin();
            }

            // Update indicators
            this._updateDisplay();
        }
    }

    /**
     * Draw the scene
     */
    _draw() {
        // Clear canvas
        this.ctx.fillStyle = '#FAFAFA';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.grid.draw(this.ctx);

        // Draw fog overlay
        this.fog.draw(this.ctx);

        // Draw ball (always visible)
        if (this.ball) {
            this.ball.draw(this.ctx, true);
        }
    }

    /**
     * Stop animation
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.erosionInterval) {
            clearInterval(this.erosionInterval);
        }
    }

    /**
     * Reset the act
     */
    reset() {
        this.stop();
        this.score = 0;
        this.round = 1;
        this._setupRound();
        this._startAnimation();
        this._updateDisplay();
    }

    /**
     * Clean up
     */
    destroy() {
        this.stop();
        const feedbackEl = document.querySelector('.round-feedback');
        if (feedbackEl) {
            feedbackEl.remove();
        }
    }
}

// Export for use in other modules
window.Act3Wobble = Act3Wobble;
