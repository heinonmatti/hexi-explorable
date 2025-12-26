/**
 * Act 1: The Trap - Teaching Hysteresis via NUDGE mechanic
 * 
 * Demonstrates hysteresis: asymmetry between entering and exiting a state.
 * 
 * Setup:
 *   - Pre-built landscape with a valley (attractor) on the left
 *   - Ball starts on a ridge to the right of the valley
 * 
 * Mechanic:
 *   - Click near the ball to NUDGE it in that direction
 *   - Phase 1: Nudge ball INTO valley (easy - gravity helps, 1-2 clicks)
 *   - Phase 2: Nudge ball OUT of valley (hard - fighting gravity, 5-8+ clicks)
 * 
 * Key insight: Falling in is easy, climbing out is hard.
 */

class Act1Trap {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.grid = null;
        this.ball = null;

        // State
        this.phase = 1;  // 1 = nudge in, 2 = nudge out
        this.nudgesIn = 0;
        this.nudgesOut = 0;
        this.totalNudges = 0;
        this.isComplete = false;
        this.ballInValley = false;
        this.ballEscaped = false;

        // Valley center position
        this.valleyCol = 7;
        this.valleyRow = 5;

        // Camera / Viewport
        this.viewOffset = { x: 0, y: 0 };
        this.targetViewOffset = { x: 0, y: 0 };
        this.cameraLerp = 0.1; // Smooth following speed

        // Nudge force - No longer used for physics, but kept for legacy ref if any
        this.nudgeForce = 6.0;

        // Tile-based mechanics state
        this.clickTargetHex = null;
        this.lastMoveTime = 0;
        this.autoRollDelay = 800; // ms to wait before auto-rolling downhill

        // Transient stability (uphill pressure)
        this.transientTimer = 0;
        this.transientDuration = 1200; // ms before sliding back
        this.isTransient = false;

        this.onComplete = null;
    }

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas ${canvasId} not found`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');

        // Create larger grid for expansive feel
        const isMobile = window.innerWidth < 650;
        const hexSize = isMobile ? 45 : 35;
        this.grid = new HexGrid(15, 11, hexSize);

        // Handle mobile sizing for better touch targets
        this.canvas.width = isMobile ? Math.min(window.innerWidth - 40, 450) : 650;
        this.canvas.height = isMobile ? Math.min(window.innerHeight * 0.6, 500) : 450;

        // Build the landscape with a pre-made valley
        this._buildLandscape();

        // Create ball and enable discrete mode
        const startCol = 10;
        const startRow = 5;
        this.ball = new Ball(this.grid, startCol, startRow);
        this.ball.isDiscreteMode = true;

        // Initialize camera to center on ball
        const startPx = this.grid.hexToPixel(startCol, startRow);
        this.viewOffset.x = startPx.x - this.canvas.width / 2;
        this.viewOffset.y = startPx.y - this.canvas.height / 2;
        this.targetViewOffset.x = this.viewOffset.x;
        this.targetViewOffset.y = this.viewOffset.y;

        // Set up click listener
        this._setupEventListeners();

        // Start animation
        this._startAnimation();

        // Reset state
        this.phase = 1;
        this.nudgesIn = 0;
        this.nudgesOut = 0;
        this.totalNudges = 0;
        this.isComplete = false;
        this.ballInValley = false;
        this.ballEscaped = false;

        this._updateUI();
        this._showPhaseInstructions(1);
    }

    _buildLandscape() {
        // Build 3-layer valley (Level 1, 2, 3 shades of green)
        // Center: Level 1 (-3) - darkest green
        const center = this.grid.getHex(this.valleyCol, this.valleyRow);
        if (center) center.elevation = -3;

        // Ring 1: Level 2 (-2) - dark green
        const ring1 = this.grid.getNeighbors(this.valleyCol, this.valleyRow);
        const ring1Set = new Set(ring1);
        for (const n of ring1) {
            if (!n.isRuin) n.elevation = -2;
        }

        // Ring 2: Level 3 (-1) - medium green
        for (const n of ring1) {
            for (const nn of this.grid.getNeighbors(n.col, n.row)) {
                // If not center and not already in ring1, make it level 3
                if (nn !== center && !ring1Set.has(nn) && !nn.isRuin) {
                    nn.elevation = -1;
                }
            }
        }
    }

    _setupEventListeners() {
        const handleClick = (e) => {
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            let x, y;

            if (e.touches) {
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }

            // Scale for CSS sizing
            x *= this.canvas.width / rect.width;
            y *= this.canvas.height / rect.height;

            // Convert click to world coordinates using camera offset
            this._handleHexClick(x + this.viewOffset.x, y + this.viewOffset.y);

            // For mobile/touch: maintain the highlight briefly so they see where they tapped
            const hex = this.grid.getHexAtPixel(x + this.viewOffset.x, y + this.viewOffset.y);
            if (hex) {
                this._highlightHexBriefly(hex);
            }
        };

        const handleDown = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            let x, y;

            if (e.touches) {
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }

            x *= this.canvas.width / rect.width;
            y *= this.canvas.height / rect.height;

            const hex = this.grid.getHexAtPixel(x + this.viewOffset.x, y + this.viewOffset.y);
            if (hex) {
                // Clear previous highlights
                for (const cell of this.grid.getAllCells()) {
                    cell.isHighlighted = false;
                    cell.isLegalMove = false;
                }

                hex.isHighlighted = true;
                const currentHex = this.ball.getCurrentHex();
                if (currentHex && (hex.col !== currentHex.col || hex.row !== currentHex.row)) {
                    const neighbors = this.grid.getNeighbors(currentHex.col, currentHex.row);
                    const isNeighbor = neighbors.some(n => n.col === hex.col && n.row === hex.row);
                    if (isNeighbor) {
                        hex.isLegalMove = true;
                    }
                }
            }
        };

        this.canvas.addEventListener('mousedown', handleDown);
        this.canvas.addEventListener('touchstart', (e) => {
            // e.preventDefault(); // Don't prevent default here as we want click to fire too
            handleDown(e);
        });

        this.canvas.addEventListener('click', handleClick);
        // touchstart is already handled by click behavior usually, 
        // but we want the 'down' feedback immediately.

        // Hover highlight
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            // Clear previous highlight
            for (const cell of this.grid.getAllCells()) {
                cell.isHighlighted = false;
                cell.isLegalMove = false;
            }

            const currentHex = this.ball.getCurrentHex();
            const hex = this.grid.getHexAtPixel(x + this.viewOffset.x, y + this.viewOffset.y);

            if (hex) {
                hex.isHighlighted = true;

                // A move is legal if the hex is ADJACENT to current ball hex 
                // and NOT the same hex as the ball
                if (currentHex && (hex.col !== currentHex.col || hex.row !== currentHex.row)) {
                    const neighbors = this.grid.getNeighbors(currentHex.col, currentHex.row);
                    const isNeighbor = neighbors.some(n => n.col === hex.col && n.row === hex.row);
                    if (isNeighbor) {
                        hex.isLegalMove = true;
                    }
                }
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            for (const cell of this.grid.getAllCells()) {
                cell.isHighlighted = false;
            }
        });
    }

    _handleHexClick(clickX, clickY) {
        if (this.ball.isMovingDiscrete()) return;

        const hex = this.grid.getHexAtPixel(clickX, clickY);
        if (!hex) return;

        const currentHex = this.ball.getCurrentHex();
        if (!currentHex) return;

        // Must click an ADJACENT hex
        const neighbors = this.grid.getNeighbors(currentHex.col, currentHex.row);
        const isNeighbor = neighbors.some(n => n.col === hex.col && n.row === hex.row);

        if (!isNeighbor) return;

        // If clicking the hex we are already in, ignore
        if (hex.col === currentHex.col && hex.row === currentHex.row) return;

        // Mechanic: Transient Stability
        const isUphill = hex.elevation > currentHex.elevation;

        // Increment stats ONLY for clicks that involve the "well" (elevation < 0)
        // Movement on Level 4 plateau (elevation 0) is "free"
        const isClickInWell = currentHex.elevation < 0 || hex.elevation < 0;

        if (isClickInWell) {
            this.totalNudges++;
            if (this.phase === 1) {
                this.nudgesIn++;
            } else {
                this.nudgesOut++;
            }
        }

        this._moveBallToHex(hex);

        // If moving uphill to a slope (Level < 0), start transient timer
        if (isUphill && hex.elevation < 0) {
            this.isTransient = true;
            this.transientTimer = this.transientDuration;
        } else {
            // Level ground or downhill: clear transient state
            this.isTransient = false;
            this.transientTimer = 0;
        }

        this._updateUI();
    }

    _shakeTowards(targetHex) {
        const center = this.grid.hexToPixel(targetHex.col, targetHex.row);
        const dx = center.x - this.ball.x;
        const dy = center.y - this.ball.y;

        // Brief nudge towards target
        this.ball.x += dx * 0.1;
        this.ball.y += dy * 0.1;

        // Snap back after a frame or two? Ball.moveTo will handle it better if we just do a tiny pulse
        setTimeout(() => {
            const resetPos = this.grid.hexToPixel(this.ball.getCurrentHex().col, this.ball.getCurrentHex().row);
            this.ball.x = resetPos.x;
            this.ball.y = resetPos.y;
        }, 50);
    }

    _moveBallToHex(hex) {
        const currentHex = this.ball.getCurrentHex();
        const isUphill = currentHex && hex.elevation > currentHex.elevation;

        // If we are not moving uphill, we should definitely not be in a transient state
        if (!isUphill) {
            this.isTransient = false;
            this.transientTimer = 0;
        }

        this.ball.moveTo(hex.col, hex.row, 400);
        this.lastMoveTime = Date.now();
    }

    _checkAutoRoll(dt) {
        if (this.ball.isMovingDiscrete()) return;

        const now = Date.now();
        if (now - this.lastMoveTime < this.autoRollDelay) return;

        const currentHex = this.ball.getCurrentHex();
        if (!currentHex) return;

        // Update transient timer
        if (this.isTransient) {
            this.transientTimer -= dt;
            if (this.transientTimer <= 0) {
                console.log("Transient stability lost! Sliding back...");
                this._slideBack(currentHex);
                return;
            }
        }

        // ONLY roll if current tile is a slope (elevation < 0)
        if (currentHex.elevation >= 0) return;

        // Check for lower neighbors
        const neighbors = this.grid.getNeighbors(currentHex.col, currentHex.row);
        let lowest = currentHex;
        for (const n of neighbors) {
            if (n.elevation < lowest.elevation) {
                lowest = n;
            }
        }

        if (lowest !== currentHex) {
            console.log("Auto-rolling downhill...");
            this._moveBallToHex(lowest);
        }
    }

    _slideBack(currentHex) {
        // Find a neighbor with lower elevation
        const neighbors = this.grid.getNeighbors(currentHex.col, currentHex.row);
        let back = null;
        for (const n of neighbors) {
            if (n.elevation < currentHex.elevation) {
                back = n;
                break; // Just take the first lower one
            }
        }

        if (back) {
            this._moveBallToHex(back);
        }
        this.isTransient = false;
        this.transientTimer = 0;
    }

    /**
     * Check game state each frame
     */
    _checkState(dt) {
        if (this.ball.isMovingDiscrete()) return;

        // Handled in _update
        this._checkAutoRoll(dt);

        if (this.isComplete) return;

        const currentHex = this.ball.getCurrentHex();
        if (!currentHex) return;

        // Check if ball is in the valley
        const inValley = currentHex.elevation === -3;

        // Phase 1: Waiting for ball to fall into valley
        if (this.phase === 1 && !this.ballInValley) {
            if (inValley) {
                this._onBallTrapped();
            }
        }

        // Phase 2: Waiting for ball to escape valley
        if (this.phase === 2 && !this.ballEscaped) {
            // Ball escaped if it reached ANY Level 4 tile (elevation 0)
            if (currentHex.elevation === 0) {
                this._onBallEscaped();
            }
        }
    }

    _onBallTrapped() {
        if (this.ballInValley) return;

        console.log('Ball trapped in valley!');
        this.ballInValley = true;
        this.phase = 2;

        this._showPhaseInstructions(2);
        this._updateUI();
    }

    _onBallEscaped() {
        if (this.ballEscaped) return;

        console.log('Ball escaped!');
        this.ballEscaped = true;
        this._completeAct();
    }

    _completeAct() {
        this.isComplete = true;

        // Update debrief
        const entryEl = document.querySelector('.entry-cost');
        const exitEl = document.querySelector('.exit-cost');

        if (entryEl) entryEl.textContent = `${this.nudgesIn} nudge${this.nudgesIn !== 1 ? 's' : ''}`;
        if (exitEl) exitEl.textContent = `${this.nudgesOut} nudge${this.nudgesOut !== 1 ? 's' : ''}`;

        // Show debrief
        const debriefEl = document.getElementById('act1-debrief');
        if (debriefEl) {
            debriefEl.style.display = 'block';
            debriefEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (this.onComplete) {
            this.onComplete({
                nudgesIn: this.nudgesIn,
                nudgesOut: this.nudgesOut,
                ratio: this.nudgesOut / Math.max(1, this.nudgesIn)
            });
        }
    }

    _highlightHexBriefly(hex) {
        hex.isHighlighted = true;

        // Remove existing timeout if any
        if (this.highlightTimeout) {
            clearTimeout(this.highlightTimeout);
        }

        this.highlightTimeout = setTimeout(() => {
            hex.isHighlighted = false;
        }, 600);
    }

    _showPhaseInstructions(phase) {
        const phase1El = document.getElementById('phase1-instructions');
        const phase2El = document.getElementById('phase2-instructions');

        if (phase1El) phase1El.style.display = phase === 1 ? 'block' : 'none';
        if (phase2El) phase2El.style.display = phase === 2 ? 'block' : 'none';
    }

    _updateUI() {
        const counter = document.getElementById('act1-clicks');
        if (counter) {
            counter.textContent = this.totalNudges;
        }
    }

    _startAnimation() {
        const animate = (timestamp) => {
            this.animationId = requestAnimationFrame(animate);

            const dt = timestamp - this.lastTime;
            this.lastTime = timestamp;

            this._update(dt);
            this._draw();
        };

        this.lastTime = performance.now();
        animate(this.lastTime);
    }

    _update(dt) {
        this.ball.update(dt);
        this._checkState(dt);

        // Update camera to follow ball
        this.targetViewOffset.x = this.ball.x - this.canvas.width / 2;
        this.targetViewOffset.y = this.ball.y - this.canvas.height / 2;

        // Smooth camera movement
        this.viewOffset.x += (this.targetViewOffset.x - this.viewOffset.x) * this.cameraLerp;
        this.viewOffset.y += (this.targetViewOffset.y - this.viewOffset.y) * this.cameraLerp;
    }

    _draw() {
        // Clear
        this.ctx.fillStyle = '#fafafa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid with camera offset
        this.grid.draw(this.ctx, this.viewOffset);

        // Draw ball with camera offset
        this.ball.draw(this.ctx, true, this.viewOffset);

        // Draw phase indicator
        if (!this.isComplete) {
            this.ctx.font = 'bold 14px "Work Sans", sans-serif';
            this.ctx.fillStyle = this.phase === 1 ? '#4db6ac' : '#ef6c00';
            this.ctx.textAlign = 'left';

            const text = this.phase === 1
                ? 'Phase 1: Click an adjacent tile to move ball INTO the valley'
                : 'Phase 2: Click an adjacent tile to move OUT';
            this.ctx.fillText(text, 10, this.canvas.height - 10);

            // Visual feedback for transient stability
            if (this.isTransient && this.transientTimer > 0) {
                const drawX = this.ball.x - this.viewOffset.x;
                const drawY = this.ball.y - this.viewOffset.y;

                this.ctx.beginPath();
                this.ctx.arc(drawX, drawY, this.ball.radius + 6, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#ef6c00';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();

                this.ctx.fillStyle = '#ef6c00';
                this.ctx.font = 'bold 11px "Work Sans", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("KEEP MOVING!", drawX, drawY - 25);
            }
        }
    }


    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    reset() {
        this.stop();

        // Reset grid and rebuild landscape
        this.grid.reset();
        this._buildLandscape();

        // Reset ball to start position
        const startCol = 10;
        const startRow = 5;
        this.ball.reset(startCol, startRow);
        this.ball.isDiscreteMode = true;

        // Reset camera
        const startPx = this.grid.hexToPixel(startCol, startRow);
        this.viewOffset.x = startPx.x - this.canvas.width / 2;
        this.viewOffset.y = startPx.y - this.canvas.height / 2;
        this.targetViewOffset.x = this.viewOffset.x;
        this.targetViewOffset.y = this.viewOffset.y;

        // Reset state
        this.phase = 1;
        this.nudgesIn = 0;
        this.nudgesOut = 0;
        this.totalNudges = 0;
        this.isComplete = false;
        this.ballInValley = false;
        this.ballEscaped = false;

        this._updateUI();
        this._showPhaseInstructions(1);

        // Hide debrief
        const debriefEl = document.getElementById('act1-debrief');
        if (debriefEl) debriefEl.style.display = 'none';

        this._startAnimation();
    }

    destroy() {
        this.stop();
    }
}

window.Act1Trap = Act1Trap;
