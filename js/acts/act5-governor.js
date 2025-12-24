/**
 * Act 5: The Governor - Sandbox Challenge
 * 
 * The final act puts everything together in a sandbox mode. Players have
 * a budget of Resilience Points to spend preparing for three crisis rounds.
 * 
 * This tests whether players can balance:
 * - Depth (stability against N-shocks) vs Width (tolerance for lateral movement)
 * - Scouting (information) vs Building (action)
 * - Focused investment vs Distributed resilience
 * 
 * The final diagnosis reveals their strategy's strengths and weaknesses.
 */

class Act5Governor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.grid = null;
        this.ball = null;
        this.fog = null;

        // Resources
        this.resiliencePoints = 50;
        this.maxRP = 50;

        // Game state
        this.phase = 'preparation'; // 'preparation' or 'crisis'
        this.crisisRound = 0;
        this.maxCrisisRounds = 3;
        this.isComplete = false;

        // Selected action
        this.selectedAction = null;
        this.awaitingHexSelection = false;

        // Tracking
        this.actionsUsed = {
            deepen: 0,
            widen: 0,
            scout: 0,
            barrier: 0
        };

        // Animation
        this.animationId = null;

        // Callbacks
        this.onComplete = null;
    }

    /**
     * Action costs
     */
    static ACTIONS = {
        deepen: { cost: 3, desc: 'Lower selected hex by 1' },
        widen: { cost: 5, desc: 'Lower hex and its neighbors' },
        scout: { cost: 2, desc: 'Reveal fog on a hex' },
        barrier: { cost: 8, desc: 'Raise hex to block paths' }
    };

    /**
     * Initialize the act
     */
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // Create larger grid
        this.grid = new HexGrid(9, 6, 35);

        // Set canvas size
        const dims = this.grid.getCanvasDimensions();
        this.canvas.width = dims.width;
        this.canvas.height = dims.height;

        // Set up landscape
        this._setupLandscape();

        // Initialize fog (partial coverage)
        this.fog = new FogSystem(this.grid);
        this._setupInitialFog();

        // Create ball
        const startHex = this.grid.getHex(4, 3);
        this.ball = new Ball(this.grid, startHex.q, startHex.r);

        // Set up event listeners
        this._setupEventListeners();

        // Start animation
        this._startAnimation();

        // Update UI
        this._updateDisplay();
    }

    /**
     * Set up the initial landscape
     */
    _setupLandscape() {
        // Create initial shallow valley
        this.grid.createValley(4, 3, -1, 1);

        // Place ruin hexes around the edges
        const ruinPositions = [
            { q: 0, r: 2 },
            { q: 0, r: 4 },
            { q: 8, r: 1 },
            { q: 8, r: 3 },
            { q: 4, r: 0 },
            { q: 4, r: 5 }
        ];

        ruinPositions.forEach(pos => {
            const hex = this.grid.getHex(pos.q, pos.r);
            if (hex) {
                this.grid.setRuin(pos.q, pos.r);
            }
        });
    }

    /**
     * Set up initial fog - hide edges
     */
    _setupInitialFog() {
        this.fog.coverAll();

        // Reveal center area
        this.fog.reveal(4, 3, 2);
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Action buttons
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const cost = parseInt(btn.dataset.cost);
                this._selectAction(action, cost);
            });
        });

        // Ready button
        const readyBtn = document.getElementById('ready-btn');
        if (readyBtn) {
            readyBtn.addEventListener('click', () => {
                this._startCrisisPhase();
            });
        }

        // Canvas clicks for hex selection
        this.canvas.addEventListener('click', (e) => {
            if (!this.awaitingHexSelection) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            this._handleHexSelection(x, y);
        });

        // Hover for hex highlight
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            // Clear all highlights
            for (const cell of this.grid.getAllCells()) {
                cell.isHighlighted = false;
            }

            if (this.awaitingHexSelection) {
                const hex = this.grid.getHexAtPixel(x, y);
                if (hex) {
                    hex.isHighlighted = true;
                }
            }
        });
    }

    /**
     * Select an action
     */
    _selectAction(action, cost) {
        if (this.phase !== 'preparation') return;
        if (this.resiliencePoints < cost) return;

        this.selectedAction = action;
        this.awaitingHexSelection = true;

        // Update button states
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.action === action) {
                btn.classList.add('selected');
            }
        });

        // Change cursor
        this.canvas.style.cursor = 'crosshair';
    }

    /**
     * Handle hex selection for action
     */
    _handleHexSelection(x, y) {
        const hex = this.grid.getHexAtPixel(x, y);
        if (!hex || !this.selectedAction) return;

        const cost = Act5Governor.ACTIONS[this.selectedAction].cost;
        if (this.resiliencePoints < cost) return;

        // Apply action
        switch (this.selectedAction) {
            case 'deepen':
                if (!hex.isRuin) {
                    this.grid.modifyElevation(hex.q, hex.r, -1);
                    this.resiliencePoints -= cost;
                    this.actionsUsed.deepen++;
                }
                break;

            case 'widen':
                if (!hex.isRuin) {
                    this.grid.modifyElevation(hex.q, hex.r, -1);
                    this.grid.getNeighbors(hex.q, hex.r).forEach(n => {
                        if (!n.isRuin) {
                            this.grid.modifyElevation(n.q, n.r, -0.5);
                        }
                    });
                    this.resiliencePoints -= cost;
                    this.actionsUsed.widen++;
                }
                break;

            case 'scout':
                this.fog.reveal(hex.q, hex.r, 1);
                this.resiliencePoints -= cost;
                this.actionsUsed.scout++;
                break;

            case 'barrier':
                if (!hex.isRuin) {
                    this.grid.modifyElevation(hex.q, hex.r, 2);
                    this.resiliencePoints -= cost;
                    this.actionsUsed.barrier++;
                }
                break;
        }

        // Reset selection
        this.selectedAction = null;
        this.awaitingHexSelection = false;
        this.canvas.style.cursor = 'default';

        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => btn.classList.remove('selected'));

        this._updateDisplay();
    }

    /**
     * Start the crisis phase
     */
    _startCrisisPhase() {
        if (this.phase !== 'preparation') return;

        this.phase = 'crisis';
        this.crisisRound = 1;

        // Hide action buttons, show crisis info
        const actionPanel = document.querySelector('.action-panel');
        if (actionPanel) {
            actionPanel.innerHTML = `
                <h4>Crisis in Progress...</h4>
                <p id="crisis-status">Round 1 of ${this.maxCrisisRounds}</p>
            `;
        }

        // Start crisis rounds
        this._runCrisisRound();
    }

    /**
     * Run a crisis round
     */
    _runCrisisRound() {
        if (this.crisisRound > this.maxCrisisRounds || this.ball.isInRuin) {
            this._completeAct();
            return;
        }

        // Update display
        const statusEl = document.getElementById('crisis-status');
        if (statusEl) {
            statusEl.textContent = `Round ${this.crisisRound} of ${this.maxCrisisRounds}`;
        }

        const roundEl = document.getElementById('round-value');
        if (roundEl) {
            roundEl.textContent = `Crisis ${this.crisisRound}/${this.maxCrisisRounds}`;
        }

        // Random event: N-shock or B-erosion
        const isNShock = Math.random() > 0.4;

        if (isNShock) {
            this._applyNShock();
        } else {
            this._applyBErosion();
        }

        // Wait and check result
        setTimeout(() => {
            if (this.ball.isInRuin) {
                this._completeAct();
            } else {
                this.crisisRound++;
                this._runCrisisRound();
            }
        }, 3000);
    }

    /**
     * Apply an N-shock (random impulse)
     */
    _applyNShock() {
        const angle = Math.random() * Math.PI * 2;
        const magnitude = 3 + Math.random() * 4;

        this.ball.applyImpulse(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );

        // Show notification
        this._showNotification('⚡ N-Shock: Random perturbation!', '#E8A838');
    }

    /**
     * Apply B-erosion (landscape degradation)
     */
    _applyBErosion() {
        this.grid.applyErosion(0.7);

        // Small perturbation
        this.ball.applyImpulse(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );

        // Show notification
        this._showNotification('🏔️ B-Erosion: Landscape degraded!', '#E07B39');
    }

    /**
     * Show a brief notification
     */
    _showNotification(text, color) {
        let notifEl = document.querySelector('.crisis-notification');
        if (!notifEl) {
            notifEl = document.createElement('div');
            notifEl.className = 'crisis-notification';
            notifEl.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                padding: 1rem 2rem;
                background: ${color};
                color: white;
                border-radius: 8px;
                font-weight: bold;
                z-index: 1000;
                animation: fadeInOut 2s ease forwards;
            `;
            document.body.appendChild(notifEl);
        }

        notifEl.textContent = text;
        notifEl.style.background = color;

        // Add animation
        notifEl.style.animation = 'none';
        notifEl.offsetHeight; // Trigger reflow
        notifEl.style.animation = 'fadeInOut 2s ease forwards';

        setTimeout(() => {
            if (notifEl.parentNode) {
                notifEl.remove();
            }
        }, 2000);
    }

    /**
     * Complete the act
     */
    _completeAct() {
        this.isComplete = true;

        // Reveal all fog
        this.fog.revealAll();

        // Generate diagnosis
        const diagnosisEl = document.getElementById('final-diagnosis');
        if (diagnosisEl) {
            diagnosisEl.innerHTML = this._generateDiagnosis();
        }

        // Show debrief
        const debriefEl = document.getElementById('final-debrief');
        if (debriefEl) {
            debriefEl.style.display = 'block';
            debriefEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (this.onComplete) {
            this.onComplete({
                survived: !this.ball.isInRuin,
                actionsUsed: this.actionsUsed,
                rpRemaining: this.resiliencePoints
            });
        }
    }

    /**
     * Generate diagnosis based on player's strategy
     */
    _generateDiagnosis() {
        const survived = !this.ball.isInRuin;
        const { deepen, widen, scout, barrier } = this.actionsUsed;
        const totalActions = deepen + widen + scout + barrier;

        let diagnosis = '';
        let strategy = '';

        // Determine strategy type
        if (deepen > widen * 2 && deepen > barrier) {
            strategy = 'depth-focused';
        } else if (widen > deepen && widen > barrier) {
            strategy = 'width-focused';
        } else if (barrier > deepen && barrier > widen) {
            strategy = 'barrier-focused';
        } else if (scout > totalActions * 0.4) {
            strategy = 'information-focused';
        } else {
            strategy = 'balanced';
        }

        // Generate specific feedback
        if (!survived) {
            switch (strategy) {
                case 'depth-focused':
                    diagnosis = `<p><strong>Diagnosis: Over-optimized for depth.</strong></p>
                        <p>You created a deep, stable valley—but put all your eggs in one basket. 
                        When B-tipping eroded that single attractor, you had no fallback.</p>
                        <p><em>Lesson: Depth without width leaves you vulnerable to landscape changes.</em></p>`;
                    break;
                case 'width-focused':
                    diagnosis = `<p><strong>Diagnosis: Spread too thin.</strong></p>
                        <p>You widened your safety zone but didn't make it deep enough. 
                        An N-shock found a weak point in your shallow defenses.</p>
                        <p><em>Lesson: Width without depth can't absorb large shocks.</em></p>`;
                    break;
                case 'barrier-focused':
                    diagnosis = `<p><strong>Diagnosis: False sense of security.</strong></p>
                        <p>Barriers can redirect threats, but they don't build true resilience. 
                        When the landscape changed, your walls couldn't adapt.</p>
                        <p><em>Lesson: Rigid defenses fail against dynamic threats.</em></p>`;
                    break;
                default:
                    diagnosis = `<p><strong>Diagnosis: Insufficient preparation.</strong></p>
                        <p>Your strategy wasn't focused enough to build adequate resilience 
                        before the crisis hit.</p>`;
            }
        } else {
            switch (strategy) {
                case 'balanced':
                    diagnosis = `<p><strong>Diagnosis: Well governed.</strong></p>
                        <p>You balanced depth, width, and information gathering. Your system 
                        was stable enough to absorb N-shocks and flexible enough to handle 
                        B-erosion.</p>
                        <p><em>This is the mark of resilient governance: redundancy without waste.</em></p>`;
                    break;
                case 'depth-focused':
                    diagnosis = `<p><strong>Diagnosis: Survived, but brittle.</strong></p>
                        <p>Your deep valley held—this time. But with ${this.crisisRound} rounds of 
                        erosion, you were getting close to the edge. More B-tipping would have found you.</p>`;
                    break;
                case 'width-focused':
                    diagnosis = `<p><strong>Diagnosis: Survived with flexibility.</strong></p>
                        <p>Your wide, distributed approach gave the system room to move. 
                        But watch out for concentrated shocks—a wider basin means less depth protection.</p>`;
                    break;
                default:
                    diagnosis = `<p><strong>Diagnosis: Survived.</strong></p>
                        <p>You made it through the crisis. Reflect on which investments 
                        paid off and which were less effective.</p>`;
            }
        }

        // Add stats
        diagnosis += `
            <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <strong>Your actions:</strong>
                <ul style="margin: 0.5rem 0 0 0;">
                    <li>Deepen: ${deepen} times</li>
                    <li>Widen: ${widen} times</li>
                    <li>Scout: ${scout} times</li>
                    <li>Barrier: ${barrier} times</li>
                    <li>RP remaining: ${this.resiliencePoints}</li>
                </ul>
            </div>
        `;

        return diagnosis;
    }

    /**
     * Update the display
     */
    _updateDisplay() {
        const rpEl = document.getElementById('rp-value');
        if (rpEl) {
            rpEl.textContent = this.resiliencePoints;
        }

        // Update action button states
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            const cost = parseInt(btn.dataset.cost);
            btn.disabled = this.resiliencePoints < cost || this.phase !== 'preparation';
        });
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
    }

    /**
     * Reset the act
     */
    reset() {
        this.stop();

        // Reset state
        this.resiliencePoints = this.maxRP;
        this.phase = 'preparation';
        this.crisisRound = 0;
        this.isComplete = false;
        this.selectedAction = null;
        this.awaitingHexSelection = false;
        this.actionsUsed = { deepen: 0, widen: 0, scout: 0, barrier: 0 };

        // Reset grid and fog
        this.grid.reset();
        this._setupLandscape();
        this.fog.reset(false);
        this._setupInitialFog();

        // Reset ball
        const startHex = this.grid.getHex(4, 3);
        this.ball.reset(startHex.q, startHex.r);

        // Restart animation
        this._startAnimation();
        this._updateDisplay();
    }

    /**
     * Clean up
     */
    destroy() {
        this.stop();
        const notifEl = document.querySelector('.crisis-notification');
        if (notifEl) notifEl.remove();
    }
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
    
    .action-btn.selected {
        border-color: #4A90D9 !important;
        box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.3) !important;
    }
`;
document.head.appendChild(style);

// Export for use in other modules
window.Act5Governor = Act5Governor;
