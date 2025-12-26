/**
 * Act 4: The Myth of Panic - Communication Choices
 * 
 * This act challenges the common assumption that transparency causes panic.
 * Research by Quarantelli and others shows that informed communities
 * self-organize and adapt, while hidden information prevents preparation.
 * 
 * Key insight: Short-term trust costs from warnings are worth the long-term
 * benefit of community resilience and self-organization.
 */

class Act4Panic {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.grid = null;
        this.ball = null;
        this.fog = null;

        // Resources
        this.trust = 100;
        this.turn = 1;
        this.maxTurns = 10;

        // Tracking
        this.reassureCount = 0;
        this.warnCount = 0;
        this.isComplete = false;

        // Animation
        this.animationId = null;
        this.erosionInterval = null;

        // Callbacks
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

        // Set up landscape
        this._setupLandscape();

        // Initialize fog (all hidden initially)
        this.fog = new FogSystem(this.grid);
        this.fog.coverAll();

        // Reveal only center area
        this.fog.reveal(3, 2, 1);

        // Create ball
        const valleyCenter = this.grid.getHex(3, 2);
        this.ball = new Ball(this.grid, valleyCenter.q, valleyCenter.r);
        this.ball.noiseLevel = 0.05;

        // Set up event listeners
        this._setupEventListeners();

        // Start animation
        this._startAnimation();

        // Start erosion (crisis is always building)
        this._startErosion();

        // Update UI
        this._updateDisplay();
    }

    /**
     * Set up the initial landscape
     */
    _setupLandscape() {
        // Create central valley
        this.grid.createValley(3, 2, -2, 1);

        // Place ruin on edges
        const ruinPositions = [
            { q: 6, r: 0 },
            { q: 6, r: 2 },
            { q: 0, r: 3 }
        ];

        ruinPositions.forEach(pos => {
            const hex = this.grid.getHex(pos.q, pos.r);
            if (hex) {
                this.grid.setRuin(pos.q, pos.r);
            }
        });
    }

    /**
     * Start background erosion (the crisis builds regardless)
     */
    _startErosion() {
        this.erosionInterval = setInterval(() => {
            if (this.isComplete) return;

            // Crisis builds each turn
            this.grid.applyErosion(0.15);

        }, 1000);
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        const reassureBtn = document.getElementById('reassure-btn');
        const warnBtn = document.getElementById('warn-btn');

        if (reassureBtn) {
            reassureBtn.addEventListener('click', () => this._handleChoice('reassure'));
        }

        if (warnBtn) {
            warnBtn.addEventListener('click', () => this._handleChoice('warn'));
        }
    }

    /**
     * Handle player's communication choice
     */
    _handleChoice(choice) {
        if (this.isComplete || this.turn > this.maxTurns) return;

        if (choice === 'reassure') {
            this._handleReassure();
        } else {
            this._handleWarn();
        }

        // Advance turn
        this.turn++;
        this._updateDisplay();

        // Add perturbation to show effect
        this.ball.applyImpulse(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );

        // Check for completion
        if (this.turn > this.maxTurns || this.ball.isInRuin) {
            this._completeAct();
        }
    }

    /**
     * Handle "Stay Calm" choice
     */
    _handleReassure() {
        this.reassureCount++;

        // Trust increases
        this.trust = Math.min(100, this.trust + 5);

        // Fog remains - community cannot prepare
        // Nothing else changes
    }

    /**
     * Handle "Warn & Empower" choice
     */
    _handleWarn() {
        this.warnCount++;

        // Trust decreases initially
        this.trust = Math.max(0, this.trust - 15);

        // Reveal some fog around ball's current position
        const currentHex = this.ball.getCurrentHex();
        if (currentHex) {
            this.fog.reveal(currentHex.q, currentHex.r, 2);
        }

        // Community "digs in" - deepens the valley
        this._communityDigsIn();
    }

    /**
     * Community self-organizes when warned
     * They deepen their own protective valley
     */
    _communityDigsIn() {
        const currentHex = this.ball.getCurrentHex();
        if (!currentHex) return;

        // Lower the current hex
        this.grid.modifyElevation(currentHex.q, currentHex.r, -0.5);

        // Also lower nearby hexes slightly
        const neighbors = this.grid.getNeighbors(currentHex.q, currentHex.r);
        neighbors.forEach(neighbor => {
            if (!neighbor.isRuin) {
                this.grid.modifyElevation(neighbor.q, neighbor.r, -0.3);
            }
        });
    }

    /**
     * Complete the act
     */
    _completeAct() {
        this.isComplete = true;

        // Stop erosion
        if (this.erosionInterval) {
            clearInterval(this.erosionInterval);
        }

        // Reveal everything
        this.fog.revealAll();

        // Generate result text
        const resultEl = document.getElementById('act4-result');
        if (resultEl) {
            resultEl.innerHTML = this._getResultText();
        }

        // Show debrief
        const debriefEl = document.getElementById('act4-debrief');
        if (debriefEl) {
            debriefEl.style.display = 'block';
            debriefEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (this.onComplete) {
            this.onComplete({
                survived: !this.ball.isInRuin,
                trust: this.trust,
                reassureCount: this.reassureCount,
                warnCount: this.warnCount
            });
        }
    }

    /**
     * Generate result text based on choices
     */
    _getResultText() {
        const survived = !this.ball.isInRuin;
        const warnRatio = this.warnCount / Math.max(1, this.reassureCount + this.warnCount);

        if (!survived) {
            if (warnRatio < 0.3) {
                return `<strong>Outcome: Collapse</strong>. You prioritized trust over transparency. 
                    Your community felt safe but wasn't prepared. When the crisis hit, 
                    there were no buffers.`;
            } else {
                return `<strong>Outcome: Collapse</strong>. Despite some warnings, the crisis 
                    was too severe. But notice how the warnings helped the community build 
                    some resilience—they just ran out of time.`;
            }
        }

        if (warnRatio > 0.7) {
            return `<strong>Outcome: Survived</strong>. Your transparency paid off. Yes, trust 
                dropped to ${this.trust}%, but look at the landscape—your community 
                <em>dug their own protective valleys</em>. They self-organized because 
                they understood the risk.`;
        } else if (warnRatio > 0.4) {
            return `<strong>Outcome: Survived</strong>. You balanced reassurance with warnings. 
                Trust is at ${this.trust}%, and the community built some resilience. 
                A middle path that worked—this time.`;
        } else {
            return `<strong>Outcome: Survived... barely</strong>. You were lucky. With mostly 
                reassurance, your community didn't build much resilience. A slightly 
                larger shock would have caused collapse.`;
        }
    }

    /**
     * Update the display
     */
    _updateDisplay() {
        const trustEl = document.getElementById('trust-value');
        if (trustEl) {
            trustEl.textContent = this.trust;
            trustEl.style.color = this.trust > 50 ? '#45B7A0' : '#E84855';
        }

        const turnsEl = document.getElementById('turns-value');
        if (turnsEl) {
            turnsEl.textContent = Math.max(0, this.maxTurns - this.turn + 1);
        }

        const currentTurnEl = document.getElementById('current-turn');
        if (currentTurnEl) {
            currentTurnEl.textContent = Math.min(this.turn, this.maxTurns);
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
     * Update physics
     */
    _update() {
        if (this.ball) {
            this.ball.update();

            // Check for ruin
            if (!this.isComplete && this.ball.isInRuin) {
                this._completeAct();
            }
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

        // Draw fog
        this.fog.draw(this.ctx);

        // Draw ball
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

        // Reset state
        this.trust = 100;
        this.turn = 1;
        this.reassureCount = 0;
        this.warnCount = 0;
        this.isComplete = false;

        // Reset grid and fog
        this.grid.reset();
        this._setupLandscape();
        this.fog.reset(false);
        this.fog.reveal(3, 2, 1);

        // Reset ball
        const valleyCenter = this.grid.getHex(3, 2);
        this.ball.reset(valleyCenter.q, valleyCenter.r);

        // Restart
        this._startAnimation();
        this._startErosion();
        this._updateDisplay();
    }

    /**
     * Clean up
     */
    destroy() {
        this.stop();
    }
}

// Export for use in other modules
window.Act4Panic = Act4Panic;
