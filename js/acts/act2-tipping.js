/**
 * Act 2: Changing the Landscape - B-Tipping
 * 
 * Bridges from Act 1's N-tipping (nudging the ball) to B-tipping (changing the landscape).
 * Ball receives random shocks (N-tipping) while user reshapes terrain (B-tipping).
 * 
 * Mechanics:
 * - Ball starts on top of a hill to the left
 * - Target (⭐) is on a high ridge on the right  
 * - Random shocks periodically nudge the ball
 * - User clicks to LIFT or LOWER terrain (stamping)
 * - Goal: Reshape landscape so ball reaches the target
 */

class Act2Tipping {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.terrain = null;
        this.ball = null;

        // Goal position (will be set relative to canvas size)
        this.goalPos = { x: 0, y: 0 };

        // State
        this.clickCount = 0;
        this.isComplete = false;
        this.editMode = 'lift'; // 'lift' or 'lower'
        this._modeBtnRect = { x: 0, y: 0, w: 0, h: 0 };

        // Random shocks (N-tipping)
        this.lastShockTime = 0;
        this.shockInterval = 1500; // Slower shocks

        // Animation
        this.animationId = null;
        this.lastTime = 0;

        // Shock Visualization State
        this.activeShock = null; // { x, y, angle, magnitude, startTime }

        // Scoring
        this.bestScore = Infinity;
        this.isNewRecord = false;
        this.prevClickCount = 0;
        this.stageAttempt = 1;
        this.stageMode = 1;

        // Callbacks
        this.onComplete = null;

        // Hidden state
        this._goalReachedTime = 0;
        this.illegalClicks = []; // Track clicks at terrain limits
        this.ruinPositions = []; // Support for multiple ruin states
        this.MAX_HEIGHT = 4.0;
        this.MIN_HEIGHT = -4.0;

        // Sensitivity Demo State
        this.demoState = 'idle'; // 'run1', 'waiting_reset', 'run2', 'success'
        this.demoRun1Path = null; // {start: {x,y}, end: {x,y}}
        this.demoRun2Path = null;
        this.demoStartTime = 0;
        this.demoDuration = 3000; // 3 seconds per run

        // Harvesting goal effect
        this.harvestingParticles = [];
    }

    /**
     * Initialize
     */
    init(canvasId, stageMode = 1) {
        console.log('Act2Tipping.init called for stage:', stageMode);

        const isStageChange = stageMode !== this.stageMode;
        this.stageMode = stageMode;

        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this._setupCanvas();
        this._setupLandscape();

        // Ball setup
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);

        let startX = w * 0.25;
        let startY = h * 0.5;

        if (this.customConfig && this.customConfig.ballStart) {
            startX = this.customConfig.ballStart.x * w;
            startY = this.customConfig.ballStart.y * h;
        }

        this.ball = new Ball(this.terrain, startX, startY);
        this.ball.noiseLevel = 0.4;

        this._setupClickHandler();
        this._setupNarrativeHandlers();

        // Initial State
        if (this.stageMode === 2) {
            this.stageAttempt = 3; // Stage 2 starts at Ruin attempt
            this.state = 's2-intro';
        } else if (isStageChange || !this.stageAttempt) {
            this.stageAttempt = 1;
        }

        // Always reset these when init is called for a new run
        this.clickCount = 0;
        this.isComplete = false;
        this.isSurprised = false;
        this.ruinPositions = [];
        this.surpriseTimer = 0;
        this._goalReachedTime = 0;
        this.harvestingParticles = [];

        // Sync system/goal labels from localStorage
        const savedSys = localStorage.getItem('hexi_act2_system') || 'the system';
        const savedGoal = localStorage.getItem('hexi_act2_goal') || 'the goal';
        document.querySelectorAll('.val-system').forEach(el => el.textContent = savedSys);
        document.querySelectorAll('.val-goal').forEach(el => el.textContent = savedGoal);

        // Custom Scenario Configuration
        this.customConfig = null;

        this._goalReachedTime = 0;
        this.lastTime = performance.now();
        this.lastShockTime = this.lastTime;
        this.activeShock = null;

        // Stage-specific setup
        if (this.stageMode === 3) {
            this.startSensitivityDemo();
        } else if (this.stageMode === 2 && this.stageAttempt === 3) {
            // Direct jump to ruin scenario
            this.state = 'playing';
            this._populateRuins();
            this._hideOverlay();
        } else if (this.stageAttempt === 2) {
            // Early Ruin for Attempt 2
            this._populateRuins();
            this.state = 'playing';
            this._hideOverlay();
        } else if (this.stageMode === 2 && this.stageAttempt === 3) {
            this.state = 's2-intro';
            this._showScreen('s2-intro');
        } else if (this.stageMode === 2 && this.stageAttempt === 1) {
            // Fallback for Stage 2 Attempt 1 if ever needed
            this.state = 's2-intro';
            this._showScreen('s2-intro');
        } else if (this.stageMode === 1 && this.stageAttempt === 1) {
            this.state = 'setup'; // Show input screen
            this._showScreen('setup');
        } else {
            // Replays or intermediate attempts
            this.state = 'playing';
            this._hideOverlay();
        }

        this._startAnimation();
    }

    startSensitivityDemo() {
        console.log('Starting Sensitivity Demo');
        this.state = 'sensitivity_demo';
        this.demoState = 'run1';
        this._hideOverlay();

        // 1. Reset setup for demo
        this.isComplete = false;
        this.ruinPositions = []; // Clear skulls from previous stages
        this.harvestingParticles = []; // Clear any residual stars
        this._setupLandscape(); // Reset terrain stamps
        if (this.ball) this.ball.terrain = this.terrain; // Re-link!

        // 2. Set ball to unstable equilibrium (same as Act 2 start)
        const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);

        // Explicitly set start to the ridge start point
        const startX = logicalWidth * 0.25;
        const startY = logicalHeight * 0.5;

        this.ball.x = startX;
        this.ball.y = startY;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.frozen = false;

        // Force noise so it moves
        this.ball.noiseLevel = 0.5;

        this.demoStartTime = performance.now();
        this.demoRun1Path = { start: { x: startX, y: startY } };

        // Ensure no old shocks are drawing
        this.activeShock = null;
    }

    continueSensitivityDemo() {
        // Called when user clicks "Start Over" after Run 1 (or after failed Run 2)
        console.log('Continuing Sensitivity Demo - Starting Run 2');
        this.state = 'sensitivity_demo'; // Ensure update loop knows we are in demo
        this.demoState = 'run2';
        this.ruinPositions = []; // SAFETY: Clear any potential skulls
        this.harvestingParticles = []; // Clear previous harvesting stars
        this._hideOverlay();

        const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);

        const startX = logicalWidth * 0.25;
        const startY = logicalHeight * 0.5;

        // Reset ball EXACTLY
        this.ball.x = startX;
        this.ball.y = startY;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.frozen = false;
        this.isComplete = false; // Reset here too just in case

        this.demoStartTime = performance.now();
        this.demoRun2Path = { start: { x: startX, y: startY } };
    }

    _setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const containerWidth = this.canvas.parentElement ? this.canvas.parentElement.clientWidth : window.innerWidth;
        const aspect = 0.6;
        // Ensure strictly positive width to avoid negative dimensions issues
        const safeWidth = Math.max(300, containerWidth || window.innerWidth);
        const cssWidth = Math.min(800, safeWidth - 20);
        const cssHeight = cssWidth * aspect;

        this.canvas.style.width = `${cssWidth}px`;
        this.canvas.style.height = `${cssHeight}px`;
        this.canvas.width = cssWidth * dpr;
        this.canvas.height = cssHeight * dpr;
        this.ctx.scale(dpr, dpr);

        this.terrain = new Terrain(cssWidth, cssHeight, 512);
    }

    _setupNarrativeHandlers() {
        const btnNext1 = document.getElementById('act2-btn-next-1');
        const btnNext2 = document.getElementById('act2-btn-next-2');
        const btnReady = document.getElementById('act2-btn-ready');
        const btnStart = document.getElementById('act2-btn-start');
        const btnReplay1 = document.getElementById('act2-btn-replay-1');
        const btnReplay2 = document.getElementById('act2-btn-replay-2');

        if (btnNext1) btnNext1.onclick = () => {
            const sys = document.getElementById('act2-input-system').value || 'The System';
            const goal = document.getElementById('act2-input-goal').value || 'The Goal';
            localStorage.setItem('hexi_act2_system', sys);
            localStorage.setItem('hexi_act2_goal', goal);

            document.querySelectorAll('.val-system').forEach(el => el.textContent = sys);
            document.querySelectorAll('.val-goal').forEach(el => el.textContent = goal);

            this._showScreen('concepts');
        };

        if (btnNext2) btnNext2.onclick = () => this._showScreen('observation');

        if (btnReady) btnReady.onclick = () => {
            this._hideOverlay();
            this.state = 'observing';
            this.observationStartTime = performance.now();
        };

        if (btnStart) btnStart.onclick = () => {
            this.reset();
            this.state = 'playing';
            this._hideOverlay();
        };

        if (btnReplay1) btnReplay1.onclick = () => {
            this.state = 'playing';
            this.stageAttempt = 2; // Second try with advice
            this.prevClickCount = this.clickCount;
            this.reset();
            this._hideOverlay();
        };

        if (btnReplay2) btnReplay2.onclick = () => {
            if (this.stageMode === 1) {
                // If ending Stage 1 normal tries, go to Stage 2 Surprise
                if (window.app && window.app.showAct) {
                    window.app.showAct('act2-s2'); // This will set attempt to 3 in init
                } else {
                    this.stageAttempt = 3;
                    this.init(this.canvas.id, 2);
                }
            } else {
                this.state = 'playing';
                this.stageAttempt = 3;
                this.reset();
                this._hideOverlay();
            }
        };


        const btnComplete = document.getElementById('act2-btn-complete');
        // Initial setup for the button if it exists
        if (btnComplete) {
            btnComplete.onclick = () => {
                if (this.stageMode === 1) {
                    if (window.app && window.app.showAct) {
                        window.app.showAct('act2-s2');
                    } else {
                        this.init(this.canvas.id, 2);
                    }
                } else {
                    this.stop();
                    // Instead of full exit, maybe show sensitivity option? 
                }
            };
        }

        // Sensitivity Demo Buttons
        const btnShowSens = document.getElementById('act2-btn-show-sensitivity');
        if (btnShowSens) {
            btnShowSens.onclick = () => {
                this.startSensitivityDemo();
            };
        }

        // Fallback or Override for btnComplete if it acts as "Show me"
        if (btnComplete && btnComplete.innerText.includes('Show me')) {
            btnComplete.onclick = () => {
                this.startSensitivityDemo();
            };
        }

        const btnSensRetry = document.getElementById('act2-sens-btn-retry');
        if (btnSensRetry) {
            btnSensRetry.onclick = () => {
                this.continueSensitivityDemo();
            };
        }

        const btnSensContinue = document.getElementById('act2-sens-btn-continue');
        if (btnSensContinue) {
            btnSensContinue.onclick = () => {
                this._showScreen('sensitivity-explainer');
            };
        }

        const btnExplainerNext = document.getElementById('act2-explainer-btn-next');
        if (btnExplainerNext) {
            btnExplainerNext.onclick = () => {
                this._showScreen('questionnaire');
            };
        }


        // Stage 2 Buttons
        const btnS2Start = document.getElementById('act2-s2-btn-start');
        const btnS2Pivot = document.getElementById('act2-s2-btn-pivot');
        const btnS2Retry = document.getElementById('act2-s2-btn-retry');

        if (btnS2Start) btnS2Start.onclick = () => {
            this._hideOverlay();
            this.state = 'playing';
            this.clickCount = 0;
        };

        if (btnS2Pivot) btnS2Pivot.onclick = () => {
            this._hideOverlay();
            this.state = 'playing';
        };

        if (btnS2Retry) btnS2Retry.onclick = () => {
            this.reset();
            this.state = 'playing';
            this._hideOverlay();
        };
    }

    _showScreen(screenId) {
        this.state = screenId;
        const overlay = document.getElementById('act2-narrative-overlay');
        const screen = document.getElementById(`act2-screen-${screenId}`);

        if (!overlay || !screen) {
            console.warn(`Narrative screen or overlay not found: ${screenId}`);
            return;
        }

        overlay.classList.remove('hidden');
        document.querySelectorAll('.narrative-overlay .screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');

        // Ensure we are at the top of the screen for mobile
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    _hideOverlay() {
        const overlay = document.getElementById('act2-narrative-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    _update(dt, timestamp) {
        if (!this.ball || this.isComplete) return;

        if (this.state === 'observing') {
            const elapsed = (timestamp - this.observationStartTime) / 1000;
            const duration = 7;

            if (elapsed >= duration) {
                this._showScreen('play-prompt');
            }
        }

        if (this.state === 'sensitivity_demo') {
            const elapsed = timestamp - this.demoStartTime;

            if (this.demoState === 'run1' || this.demoState === 'run2') {
                // Stop after duration
                if (elapsed > this.demoDuration) {
                    this.ball.frozen = true;

                    if (this.demoState === 'run1') {
                        this.demoRun1Path.end = { x: this.ball.x, y: this.ball.y };
                        this.demoState = 'waiting_retry';
                        // Show "Start Over" popup
                        this._showScreen('sensitivity-retry');
                    } else if (this.demoState === 'run2') {
                        this.demoRun2Path.end = { x: this.ball.x, y: this.ball.y };

                        // Compare
                        if (this._checkSensitivityDivergence()) {
                            this.demoState = 'success';
                            setTimeout(() => {
                                this._showScreen('sensitivity-explainer');
                            }, 500);
                        } else {
                            // Failed to diverge enough. Loop.
                            this.demoRun1Path = this.demoRun2Path;
                            this.demoRun2Path = null;
                            this.demoState = 'waiting_retry';
                            this._showScreen('sensitivity-retry');
                        }
                    }
                }
            }
        }

        // Random shocks - active during 'observing', 'playing', and 'sensitivity_demo' runs
        const inDemoRun = this.state === 'sensitivity_demo' && (this.demoState === 'run1' || this.demoState === 'run2') && !this.ball.frozen;
        if ((this.state === 'playing' || this.state === 'observing' || inDemoRun) && !this._goalReachedTime) {
            if (timestamp - this.lastShockTime > this.shockInterval) {
                const force = 1.2 + Math.random() * 0.8;
                const angle = Math.random() * Math.PI * 2;
                this.ball.applyImpulse(Math.cos(angle) * force, Math.sin(angle) * force);
                this.activeShock = { x: this.ball.x, y: this.ball.y, angle, magnitude: force, startTime: timestamp };
                this.lastShockTime = timestamp;
            }
        }

        // --- Core Movement ---
        if (this.state === 'playing' || this.state === 'observing' || (this.state === 'sensitivity_demo' && !this.ball.frozen)) {
            this.ball.update(dt);
        }

        // --- Harvesting Effect Particles (Update/Cleanup) ---
        // Always update particles so they can finish their fade out in any state
        for (let i = this.harvestingParticles.length - 1; i >= 0; i--) {
            const p = this.harvestingParticles[i];
            p.life -= 0.02 * (dt / 16.7);
            if (p.life <= 0) {
                this.harvestingParticles.splice(i, 1);
                continue;
            }
            p.wavyOffset += 0.1 * (dt / 16.7);
            p.x += p.vx + Math.sin(p.wavyOffset) * 0.5;
            p.y += p.vy;
        }

        // --- Interaction & Goal Logic ---
        if (this.state === 'playing') {
            const dx = this.ball.x - this.goalPos.x;
            const dy = this.ball.y - this.goalPos.y;

            // Check for collision
            if (Math.hypot(dx, dy) < 28 && !this._goalReachedTime) {
                this._goalReachedTime = timestamp;
            }

            // --- Harvesting Effect Particles (Spawner) ---
            // If ball is near goal OR already goal reached, spawn particles
            if (this._goalReachedTime || Math.hypot(dx, dy) < 35) {
                if (Math.random() < 0.3) {
                    this.harvestingParticles.push({
                        x: this.ball.x + (Math.random() - 0.5) * 20,
                        y: this.ball.y - 10,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: -1.5 - Math.random() * 2,
                        angle: Math.random() * Math.PI * 2,
                        wavyOffset: Math.random() * Math.PI * 2,
                        life: 1.0,
                        size: 10 + Math.random() * 10
                    });
                }
            }

            if (this._goalReachedTime && timestamp - this._goalReachedTime > 1500) {
                this._handleWin();
            }

            // Stage 2 Attempt 3 Surprise logic
            if (this.stageAttempt === 3 && !this.isSurprised) {
                const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
                if (this.ball.x > logicalWidth * 0.5) {
                    this.isSurprised = true;
                    this.ruinPositions.push({ ...this.goalPos });
                    const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);
                    this.goalPos = { x: logicalWidth * 0.2, y: logicalHeight * 0.2 };
                    this.surpriseTimer = timestamp;
                }
            }

            // Uh-oh pop-up timer
            if (this.isSurprised && this.surpriseTimer && timestamp - this.surpriseTimer > 2000) {
                this.surpriseTimer = 0;
                this._showScreen('s2-surprise');
            }

            // Ruin check (Failure condition)
            for (const ruin of this.ruinPositions) {
                const rx = this.ball.x - ruin.x;
                const ry = this.ball.y - ruin.y;
                if (Math.hypot(rx, ry) < 28) {
                    this.state = 'failed';
                    this._showScreen('s2-failed');
                    break;
                }
            }
        }
    }

    _handleWin() {
        if (this.isComplete) return;
        this.isComplete = true;

        if (this.stageAttempt === 2) {
            const resultDiv = document.getElementById('comparison-result');
            if (this.clickCount < this.prevClickCount) {
                resultDiv.innerHTML = `<p><strong>Congratulations!</strong> You reached the goal in <strong>${this.clickCount}</strong> stamps, down from the <strong>${this.prevClickCount}</strong> of last time. Working smartly paid off!</p>`;
            } else {
                resultDiv.innerHTML = `<p>You reached the goal again! This time, you used <strong>${this.clickCount}</strong> stamps (compared to ${this.prevClickCount} last time). But sometimes that's what happens – navigating the landscape can be unpredictable!</p>`;
            }

            if (this.stageMode === 2) {
                const comparisonScreen = document.getElementById('act2-screen-comparison');
                const paragraphs = comparisonScreen.querySelectorAll('p');
                if (paragraphs.length >= 3) {
                    paragraphs[2].textContent = "But even the best laid plans can be disrupted by systemic shifts. Ready to see how your strategy holds up when the landscape moves?";
                }
                const btn = document.getElementById('act2-btn-replay-2');
                if (btn) btn.textContent = "Start Final Challenge";
            } else {
                const comparisonScreen = document.getElementById('act2-screen-comparison');
                const paragraphs = comparisonScreen.querySelectorAll('p');
                const btn = document.getElementById('act2-btn-replay-2');
                if (btn) btn.textContent = "Start Final Try";
            }
            this._showScreen('comparison');
        } else if (this.stageAttempt === 3) {
            this._showScreen('final');
        } else {
            document.querySelectorAll('.val-clicks').forEach(el => el.textContent = this.clickCount);
            this._showScreen('strategy');
        }
    }

    _checkSensitivityDivergence() {
        if (!this.demoRun1Path || !this.demoRun2Path) return false;
        const v1x = this.demoRun1Path.end.x - this.demoRun1Path.start.x;
        const v1y = this.demoRun1Path.end.y - this.demoRun1Path.start.y;
        const v2x = this.demoRun2Path.end.x - this.demoRun2Path.start.x;
        const v2y = this.demoRun2Path.end.y - this.demoRun2Path.start.y;
        const mag1 = Math.hypot(v1x, v1y);
        const mag2 = Math.hypot(v2x, v2y);
        if (mag1 < 5 || mag2 < 5) return false;
        const dot = v1x * v2x + v1y * v2y;
        const cosAngle = dot / (mag1 * mag2);
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        const angleDeg = Math.acos(clampedCos) * (180 / Math.PI);
        console.log(`Sensitivity Test: Angle diff = ${angleDeg.toFixed(1)} degrees`);
        return angleDeg > 30;
    }

    _draw() {
        if (!this.ctx) return;
        const logicalW = this.canvas.width / (window.devicePixelRatio || 1);
        const logicalH = this.canvas.height / (window.devicePixelRatio || 1);
        this.ctx.clearRect(0, 0, logicalW, logicalH);

        this.terrain.draw(this.ctx);
        if (this.state !== 'sensitivity_demo') {
            this._drawGoal();
        } else {
            this._drawSensitivityTraces();
        }
        this._drawShockArrow();
        if (this.ball) this.ball.draw(this.ctx, true);
        this._drawHarvestingParticles();
        this._drawIllegalClicks();
        this._drawUI();
    }

    _drawIllegalClicks() {
        if (this.illegalClicks.length === 0) return;
        const now = performance.now();
        const duration = 1000;
        this.ctx.save();
        this.ctx.font = 'bold 24px "Work Sans", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        for (let i = this.illegalClicks.length - 1; i >= 0; i--) {
            const click = this.illegalClicks[i];
            const elapsed = now - click.startTime;
            if (elapsed > duration) {
                this.illegalClicks.splice(i, 1);
                continue;
            }
            const alpha = 1.0 - (elapsed / duration);
            this.ctx.fillStyle = `rgba(211, 47, 47, ${alpha})`;
            this.ctx.fillText('X', click.x, click.y);
        }
        this.ctx.restore();
    }

    _drawGoal() {
        const { x, y } = this.goalPos;
        this.ctx.save();
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'gold';
        this.ctx.font = '30px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⭐', x, y);
        this.ctx.restore();

        for (const ruin of this.ruinPositions) {
            this.ctx.save();
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'red';
            this.ctx.font = '30px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('💀', ruin.x, ruin.y);
            this.ctx.restore();
        }
    }

    _drawHarvestingParticles() {
        if (this.harvestingParticles.length === 0) return;
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        for (const p of this.harvestingParticles) {
            this.ctx.globalAlpha = p.life;
            this.ctx.font = `${p.size}px sans-serif`;
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = 'gold';
            this.ctx.fillText('⭐', p.x, p.y);
        }
        this.ctx.restore();
    }

    _drawShockArrow() {
        if (!this.activeShock) return;
        const duration = 600;
        const elapsed = performance.now() - this.activeShock.startTime;
        if (elapsed > duration) {
            this.activeShock = null;
            return;
        }
        const alpha = 1.0 - (elapsed / duration);
        const { x, y, angle, magnitude } = this.activeShock;
        const length = magnitude * 15;
        const headSize = 10;
        const thickness = Math.max(2, magnitude * 1.5);
        const rim = 12;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.lineWidth = thickness;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = `rgba(239, 83, 80, ${alpha})`;
        const headX = -rim;
        const tailX = -rim - length;
        this.ctx.moveTo(tailX, 0);
        this.ctx.lineTo(headX, 0);
        this.ctx.moveTo(headX - headSize, -headSize);
        this.ctx.lineTo(headX, 0);
        this.ctx.lineTo(headX - headSize, headSize);
        this.ctx.stroke();
        this.ctx.restore();
    }

    _drawSensitivityTraces() {
        if (this.demoRun1Path) {
            const s = this.demoRun1Path.start;
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        if (this.demoRun1Path && this.demoRun1Path.end) {
            this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            this.ctx.setLineDash([5, 5]);
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.demoRun1Path.start.x, this.demoRun1Path.start.y);
            this.ctx.lineTo(this.demoRun1Path.end.x, this.demoRun1Path.end.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.beginPath();
            this.ctx.arc(this.demoRun1Path.end.x, this.demoRun1Path.end.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    _drawUI() {
        const overlay = document.getElementById('act2-narrative-overlay');
        const isOverlayVisible = overlay && !overlay.classList.contains('hidden');
        if (isOverlayVisible || this.state === 'observing' || this.state === 'setup') return;
        if (!this.isComplete) {
            this._drawModeToggle();
            this._drawClickCounter();
        }
    }

    _drawClickCounter() {
        const text = `Stamps used: ${this.clickCount}`;
        this.ctx.font = '14px "Work Sans", sans-serif';
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(text, this.canvas.width / (window.devicePixelRatio || 1) - 15, 25);
    }

    _drawModeToggle() {
        const text = this.editMode === 'lift' ? '⬆️ LIFT' : '⬇️ LOWER';
        this.ctx.font = 'bold 18px "Work Sans", sans-serif';
        const metrics = this.ctx.measureText(text);
        const pad = 15;
        const h = 44;
        const w = metrics.width + pad * 2;
        const x = 10;
        const y = this.canvas.height / (window.devicePixelRatio || 1) - h - 10;
        this._modeBtnRect = { x, y, w, h };
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.strokeStyle = this.editMode === 'lift' ? '#E65100' : '#01579B';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, 8);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x + w / 2, y + h / 2);
        this.ctx.restore();
    }

    _setupLandscape() {
        if (this.customConfig && this.customConfig.heights) {
            this._setupCustomLandscape();
            return;
        }
        if (window.Act2DefaultLandscape && window.Act2DefaultLandscape.heights) {
            this.customConfig = window.Act2DefaultLandscape;
            this._setupCustomLandscape();
            return;
        }
        const w = this.terrain.width;
        const h = this.terrain.height;
        for (let i = 0; i < this.terrain.heights.length; i++) this.terrain.heights[i] = 0;
        if (this.terrain.generateFractal) this.terrain.generateFractal();
        const startX = w * 0.25;
        const startY = h * 0.5;
        this.terrain.raise(startX, startY, 4.0, w * 0.15);
        this.terrain.raise(w * 0.35, h * 0.25, -4.0, w * 0.12);
        this.terrain.raise(w * 0.2, h * 0.25, -4.0, w * 0.12);
        this.terrain.raise(w * 0.08, h * 0.5, -4.0, w * 0.15);
        this.terrain.raise(w * 0.2, h * 0.75, -4.0, w * 0.12);
        this.terrain.raise(w * 0.35, h * 0.75, -4.0, w * 0.12);
        this.terrain.raise(w * 0.2, h * 0.85, -3.5, w * 0.15);
        for (let y = 0; y <= h; y += h / 5) {
            const jX = w * 0.55 + (Math.random() - 0.5) * 50;
            this.terrain.raise(jX, y, 1.4, w * 0.12);
        }
        this.goalPos = { x: w * 0.85, y: h * 0.5 };
        this.terrain.raise(this.goalPos.x, this.goalPos.y, 4.0, w * 0.15);
        this.terrain.addNoise(0.2, 50.0);
    }

    _setupClickHandler() {
        this.canvas.onmousedown = (e) => {
            if (this.state !== 'playing' || this.isComplete) return;
            if (e.button !== 0) return;
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width / dpr);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height / dpr);
            if (this._checkModeButtonClick(x, y)) return;
            const currentH = this.terrain.getHeightAt(x, y);
            const amt = this.editMode === 'lift' ? 2.5 : -2.5;
            if (this.editMode === 'lift' && currentH >= (this.MAX_HEIGHT * 0.95)) {
                this.illegalClicks.push({ x, y, startTime: performance.now() });
                return;
            }
            if (this.editMode === 'lower' && currentH <= (this.MIN_HEIGHT * 0.95)) {
                this.illegalClicks.push({ x, y, startTime: performance.now() });
                return;
            }
            this.terrain.raise(x, y, amt, 40);
            this.clickCount++;
            this.ball.applyImpulse((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        };
        this.canvas.oncontextmenu = (e) => {
            e.preventDefault();
            this.editMode = this.editMode === 'lift' ? 'lower' : 'lift';
        };
    }

    _checkModeButtonClick(x, y) {
        const btn = this._modeBtnRect;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            this.editMode = this.editMode === 'lift' ? 'lower' : 'lift';
            return true;
        }
        return false;
    }

    _startAnimation() {
        const animate = (timestamp) => {
            if (!this.canvas) return;
            this.animationId = requestAnimationFrame(animate);
            this.lastTime = this.lastTime || timestamp;
            const dt = timestamp - this.lastTime;
            this.lastTime = timestamp;
            this._update(dt, timestamp);
            this._draw();
        };
        requestAnimationFrame(animate);
    }

    stop() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    reset() {
        console.log('Act2Tipping Reset - Stage:', this.stageMode, 'Attempt:', this.stageAttempt);
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.isComplete = false;
        this.clickCount = 0;
        this._goalReachedTime = 0;
        this.isSurprised = false;
        this.ruinPositions = [];
        this.surpriseTimer = 0;
        this.lastTime = 0;
        this.illegalClicks = [];
        this.harvestingParticles = [];
        this._setupLandscape();
        const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);
        if (this.ball) {
            if (this.customConfig && this.customConfig.ballStart) {
                this.ball.x = this.customConfig.ballStart.x * logicalWidth;
                this.ball.y = this.customConfig.ballStart.y * logicalHeight;
            } else {
                this.ball.x = logicalWidth * 0.25;
                this.ball.y = logicalHeight * 0.5;
            }
            this.ball.vx = 0;
            this.ball.vy = 0;
            this.ball.terrain = this.terrain;
        }
        this._populateRuins();
        this._startAnimation();
    }

    loadConfig(config) {
        this.customConfig = config;
        this.reset();
    }

    _setupCustomLandscape() {
        if (!this.customConfig || !this.customConfig.heights) return;
        if (this.terrain.heights.length !== this.customConfig.heights.length) {
            const newRes = Math.sqrt(this.customConfig.heights.length);
            if (Number.isInteger(newRes)) {
                this.terrain = new Terrain(this.terrain.width, this.terrain.height, newRes);
            }
        }
        if (this.terrain.heights.length === this.customConfig.heights.length) {
            this.terrain.heights.set(this.customConfig.heights);
        }
        const w = this.terrain.width;
        const h = this.terrain.height;
        this.goalPos = { x: w * 0.85, y: h * 0.5 };
    }

    _populateRuins() {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;
        if (this.stageAttempt === 2) {
            this.ruinPositions.push({ x: w * 0.5, y: h * 0.25 });
        } else if (this.stageAttempt === 3) {
            this.ruinPositions.push({ x: w * 0.5, y: h * 0.25 });
            this.ruinPositions.push({ x: w * 0.1, y: h * 0.3 });
            this.ruinPositions.push({ x: w * 0.4, y: h * 0.9 });
            this.ruinPositions.push({ x: w * 0.6, y: h * 0.65 });
        }
    }
}

window.Act2Tipping = Act2Tipping;
