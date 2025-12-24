/**
 * Act 2: Two Ways to Tip - N-Tipping vs B-Tipping
 * 
 * This act demonstrates the two fundamental ways complex systems can fail:
 * 
 * N-Tipping (Noise-induced): A stable system is pushed into failure by a
 *   random shock. The landscape itself is fine; bad luck struck.
 * 
 * B-Tipping (Bifurcation-induced): The landscape gradually erodes, making
 *   the system increasingly fragile until even small perturbations cause failure.
 * 
 * Key insight: Prevention strategies differ. For N-tipping, build buffers.
 * For B-tipping, monitor whether the landscape is changing.
 */

class Act2Tipping {
    constructor() {
        // Grid A: N-Tipping (noise-induced)
        this.canvasA = null;
        this.ctxA = null;
        this.gridA = null;
        this.ballA = null;

        // Grid B: B-Tipping (bifurcation-induced)
        this.canvasB = null;
        this.ctxB = null;
        this.gridB = null;
        this.ballB = null;

        // State
        this.noiseLevel = 0;
        this.erosionCount = 0;
        this.nTipped = false;
        this.bTipped = false;

        // Animation
        this.animationId = null;

        // Callbacks
        this.onNTip = null;
        this.onBTip = null;
        this.onBothTipped = null;
    }

    /**
     * Initialize both grids
     */
    init(canvasAId, canvasBId) {
        this._initGridA(canvasAId);
        this._initGridB(canvasBId);
        this._setupControlListeners();
        this._startAnimation();
    }

    /**
     * Initialize Grid A (N-Tipping)
     */
    _initGridA(canvasId) {
        this.canvasA = document.getElementById(canvasId);
        if (!this.canvasA) return;

        this.ctxA = this.canvasA.getContext('2d');

        // Create grid
        this.gridA = new HexGrid(5, 4, 35);

        // Set canvas size
        const dims = this.gridA.getCanvasDimensions();
        this.canvasA.width = dims.width;
        this.canvasA.height = dims.height;

        // Create a valley with the ball
        this._setupValleyWithRuin(this.gridA);

        // Place ball in valley
        const valleyCenter = this.gridA.getHex(2, 1);
        this.ballA = new Ball(this.gridA, valleyCenter.q, valleyCenter.r);
    }

    /**
     * Initialize Grid B (B-Tipping)
     */
    _initGridB(canvasId) {
        this.canvasB = document.getElementById(canvasId);
        if (!this.canvasB) return;

        this.ctxB = this.canvasB.getContext('2d');

        // Create grid
        this.gridB = new HexGrid(5, 4, 35);

        // Set canvas size
        const dims = this.gridB.getCanvasDimensions();
        this.canvasB.width = dims.width;
        this.canvasB.height = dims.height;

        // Create a valley with the ball
        this._setupValleyWithRuin(this.gridB);

        // Place ball in valley
        const valleyCenter = this.gridB.getHex(2, 1);
        this.ballB = new Ball(this.gridB, valleyCenter.q, valleyCenter.r);
        this.ballB.noiseLevel = 0.05; // Very low noise for B scenario
    }

    /**
     * Set up a valley with adjacent ruin
     */
    _setupValleyWithRuin(grid) {
        // Create valley in center-left
        grid.createValley(2, 1, -2, 1);

        // Place ruin on right side
        const ruinHex = grid.getHex(4, 0);
        if (ruinHex) {
            grid.setRuin(ruinHex.q, ruinHex.r);
        }

        // Create a slight ridge between valley and ruin
        const ridgeHex = grid.getHex(3, 0);
        if (ridgeHex) {
            ridgeHex.elevation = 1;
        }
    }

    /**
     * Set up control listeners
     */
    _setupControlListeners() {
        // Noise slider for Grid A
        const noiseSlider = document.getElementById('noise-slider');
        const noiseValue = document.getElementById('noise-value');

        if (noiseSlider && noiseValue) {
            noiseSlider.addEventListener('input', () => {
                this.noiseLevel = parseInt(noiseSlider.value) / 100;
                noiseValue.textContent = `${noiseSlider.value}%`;

                if (this.ballA) {
                    this.ballA.noiseLevel = this.noiseLevel;
                }
            });
        }

        // Time passes button for Grid B
        const timePassesBtn = document.getElementById('time-passes-btn');
        const erosionCountEl = document.getElementById('erosion-count');

        if (timePassesBtn) {
            timePassesBtn.addEventListener('click', () => {
                this.erosionCount++;

                // Apply erosion to Grid B
                this.gridB.applyErosion(0.5);

                // Update display
                if (erosionCountEl) {
                    erosionCountEl.textContent = `Erosion cycles: ${this.erosionCount}`;
                }

                // Add a small perturbation to show the effect
                this.ballB.applyImpulse(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                );
            });
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
        // Update both balls
        if (this.ballA) {
            this.ballA.update();

            // Check for N-tipping
            if (!this.nTipped && this.ballA.isInRuin) {
                this._handleNTip();
            }
        }

        if (this.ballB) {
            this.ballB.update();

            // Check for B-tipping
            if (!this.bTipped && this.ballB.isInRuin) {
                this._handleBTip();
            }
        }
    }

    /**
     * Handle N-tipping event
     */
    _handleNTip() {
        this.nTipped = true;

        // Show label
        const label = document.getElementById('n-tip-label');
        if (label) {
            label.style.display = 'block';
        }

        if (this.onNTip) {
            this.onNTip({
                noiseLevel: this.noiseLevel
            });
        }

        this._checkBothTipped();
    }

    /**
     * Handle B-tipping event
     */
    _handleBTip() {
        this.bTipped = true;

        // Show label
        const label = document.getElementById('b-tip-label');
        if (label) {
            label.style.display = 'block';
        }

        if (this.onBTip) {
            this.onBTip({
                erosionCycles: this.erosionCount
            });
        }

        this._checkBothTipped();
    }

    /**
     * Check if both scenarios completed
     */
    _checkBothTipped() {
        if (this.nTipped && this.bTipped && this.onBothTipped) {
            // Show quiz
            const quizSection = document.getElementById('act2-quiz');
            if (quizSection) {
                quizSection.style.display = 'block';
                quizSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            this.onBothTipped();
        }
    }

    /**
     * Draw both grids
     */
    _draw() {
        // Draw Grid A
        if (this.ctxA && this.gridA) {
            this.ctxA.fillStyle = '#FAFAFA';
            this.ctxA.fillRect(0, 0, this.canvasA.width, this.canvasA.height);
            this.gridA.draw(this.ctxA);
            if (this.ballA) {
                this.ballA.draw(this.ctxA, true);
            }
        }

        // Draw Grid B
        if (this.ctxB && this.gridB) {
            this.ctxB.fillStyle = '#FAFAFA';
            this.ctxB.fillRect(0, 0, this.canvasB.width, this.canvasB.height);
            this.gridB.draw(this.ctxB);
            if (this.ballB) {
                this.ballB.draw(this.ctxB, true);
            }
        }
    }

    /**
     * Reset Grid A
     */
    resetA() {
        this.gridA.reset();
        this._setupValleyWithRuin(this.gridA);

        const valleyCenter = this.gridA.getHex(2, 1);
        this.ballA.reset(valleyCenter.q, valleyCenter.r);
        this.ballA.noiseLevel = this.noiseLevel;

        this.nTipped = false;
        const label = document.getElementById('n-tip-label');
        if (label) label.style.display = 'none';
    }

    /**
     * Reset Grid B
     */
    resetB() {
        this.erosionCount = 0;

        this.gridB.reset();
        this._setupValleyWithRuin(this.gridB);

        const valleyCenter = this.gridB.getHex(2, 1);
        this.ballB.reset(valleyCenter.q, valleyCenter.r);
        this.ballB.noiseLevel = 0.05;

        this.bTipped = false;
        const label = document.getElementById('b-tip-label');
        if (label) label.style.display = 'none';

        const erosionCountEl = document.getElementById('erosion-count');
        if (erosionCountEl) {
            erosionCountEl.textContent = 'Erosion cycles: 0';
        }
    }

    /**
     * Reset everything
     */
    reset() {
        this.resetA();
        this.resetB();
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
     * Clean up
     */
    destroy() {
        this.stop();
    }
}

/**
 * Quiz handler for Act 2
 */
class Act2Quiz {
    constructor() {
        this.correctAnswers = 0;
        this.totalQuestions = 3;
        this.answeredQuestions = new Set();

        this.onComplete = null;
    }

    /**
     * Initialize quiz
     */
    init() {
        const questions = document.querySelectorAll('.quiz-question');

        questions.forEach((question, index) => {
            const correctAnswer = question.dataset.correct;
            const buttons = question.querySelectorAll('.quiz-btn');
            const feedback = question.querySelector('.feedback');

            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (this.answeredQuestions.has(index)) return;

                    this.answeredQuestions.add(index);
                    const answer = btn.dataset.answer;
                    const isCorrect = answer === correctAnswer;

                    // Style buttons
                    buttons.forEach(b => {
                        b.disabled = true;
                        if (b.dataset.answer === correctAnswer) {
                            b.classList.add('correct');
                        } else if (b === btn && !isCorrect) {
                            b.classList.add('incorrect');
                        }
                    });

                    // Show feedback
                    if (feedback) {
                        if (isCorrect) {
                            this.correctAnswers++;
                            feedback.textContent = 'Correct!';
                            feedback.className = 'feedback correct';
                        } else {
                            feedback.textContent = correctAnswer === 'n'
                                ? 'Not quite. This was N-tipping — a random shock hit a stable system.'
                                : 'Not quite. This was B-tipping — gradual erosion made the system fragile.';
                            feedback.className = 'feedback incorrect';
                        }
                    }

                    // Check if quiz is complete
                    if (this.answeredQuestions.size === this.totalQuestions) {
                        this._handleComplete();
                    }
                });
            });
        });
    }

    /**
     * Handle quiz completion
     */
    _handleComplete() {
        // Show continue button
        const continueBtn = document.getElementById('continue-to-act2-debrief');
        if (continueBtn) {
            continueBtn.style.display = 'block';
        }

        if (this.onComplete) {
            this.onComplete({
                correct: this.correctAnswers,
                total: this.totalQuestions
            });
        }
    }

    /**
     * Reset quiz
     */
    reset() {
        this.correctAnswers = 0;
        this.answeredQuestions.clear();

        const questions = document.querySelectorAll('.quiz-question');
        questions.forEach(question => {
            const buttons = question.querySelectorAll('.quiz-btn');
            const feedback = question.querySelector('.feedback');

            buttons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('correct', 'incorrect');
            });

            if (feedback) {
                feedback.textContent = '';
                feedback.className = 'feedback';
            }
        });

        const continueBtn = document.getElementById('continue-to-act2-debrief');
        if (continueBtn) {
            continueBtn.style.display = 'none';
        }
    }
}

// Export for use in other modules
window.Act2Tipping = Act2Tipping;
window.Act2Quiz = Act2Quiz;
