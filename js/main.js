/**
 * Main Application - Resilience Landscapes
 * 
 * This file orchestrates the entire explorable experience, managing
 * navigation between acts and handling global state.
 */

class ResilienceLandscapesApp {
    constructor() {
        // Acts
        this.act1 = null;
        this.act2 = null;
        this.act2Quiz = null;
        this.act3 = null;
        this.act4 = null;
        this.act5 = null;

        // State
        this.currentAct = 0; // 0 = intro, 1-5 = acts

        // Bind methods
        this._onStartClick = this._onStartClick.bind(this);
    }

    /**
     * Initialize the app
     */
    init() {
        console.log('🌊 Resilience Landscapes initializing...');

        // Set up navigation listeners
        this._setupNavigationListeners();

        // Show intro, hide all acts
        this._showSection('intro');

        console.log('✅ Ready');
    }

    /**
     * Set up navigation button listeners
     */
    _setupNavigationListeners() {
        // Start button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', this._onStartClick);
        }

        // Continue buttons
        const continueToIntermission = document.getElementById('continue-to-intermission');
        if (continueToIntermission) {
            continueToIntermission.addEventListener('click', () => {
                this._hideAllSections();
                this._showSection('intermission');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        const sendFeedbackBtn = document.getElementById('send-feedback-btn');
        if (sendFeedbackBtn) {
            sendFeedbackBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const form = document.querySelector('form[name="act1-feedback"]');

                // Submit to Netlify via AJAX
                fetch("/", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(new FormData(form)).toString(),
                })
                    .then(() => {
                        console.log('User Feedback submitted to Netlify');

                        // Show thanks
                        const thanksEl = document.getElementById('feedback-thanks');
                        if (thanksEl) thanksEl.style.display = 'block';

                        // Disable button
                        sendFeedbackBtn.disabled = true;
                        sendFeedbackBtn.textContent = 'Shared';
                    })
                    .catch((error) => console.error('Feedback submission error:', error));
            });
        }

        const continueToAct2Debrief = document.getElementById('continue-to-act2-debrief');
        if (continueToAct2Debrief) {
            continueToAct2Debrief.addEventListener('click', () => {
                this._showSection('act2-debrief');
            });
        }

        const continueToAct3 = document.getElementById('continue-to-act3');
        if (continueToAct3) {
            continueToAct3.addEventListener('click', () => this._startAct(3));
        }

        const continueToAct4 = document.getElementById('continue-to-act4');
        if (continueToAct4) {
            continueToAct4.addEventListener('click', () => this._startAct(4));
        }

        const continueToAct5 = document.getElementById('continue-to-act5');
        if (continueToAct5) {
            continueToAct5.addEventListener('click', () => this._startAct(5));
        }

        // Restart button
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this._restart());
        }
    }

    /**
     * Handle start button click
     */
    _onStartClick() {
        this._startAct(1);
    }

    /**
     * Start a specific act
     */
    _startAct(actNumber) {
        console.log(`Starting Act ${actNumber}`);

        // Stop any running acts
        this._stopAllActs();

        // Hide all sections
        this._hideAllSections();

        // Start the appropriate act
        switch (actNumber) {
            case 1:
                this._showSection('act1');
                this._initAct1();
                break;
            case 2:
                this._showSection('act2');
                this._initAct2();
                break;
            case 3:
                this._showSection('act3');
                this._initAct3();
                break;
            case 4:
                this._showSection('act4');
                this._initAct4();
                break;
            case 5:
                this._showSection('act5');
                this._initAct5();
                break;
        }

        this.currentAct = actNumber;

        // Scroll to top of act
        const actEl = document.getElementById(`act${actNumber}`);
        if (actEl) {
            actEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Initialize Act 1
     */
    _initAct1() {
        if (!this.act1) {
            this.act1 = new Act1Trap();
        }
        this.act1.init('act1-canvas');

        this.act1.onComplete = (data) => {
            console.log('Act 1 complete:', data);
        };
    }

    /**
     * Initialize Act 2
     */
    _initAct2() {
        if (!this.act2) {
            this.act2 = new Act2Tipping();
        }
        this.act2.init('act2a-canvas', 'act2b-canvas');

        if (!this.act2Quiz) {
            this.act2Quiz = new Act2Quiz();
            this.act2Quiz.init();
        }

        this.act2.onBothTipped = () => {
            console.log('Both tipping scenarios demonstrated');
        };
    }

    /**
     * Initialize Act 3
     */
    _initAct3() {
        if (!this.act3) {
            this.act3 = new Act3Wobble();
        }
        this.act3.init('act3-canvas');

        this.act3.onComplete = (data) => {
            console.log('Act 3 complete:', data);
        };
    }

    /**
     * Initialize Act 4
     */
    _initAct4() {
        if (!this.act4) {
            this.act4 = new Act4Panic();
        }
        this.act4.init('act4-canvas');

        this.act4.onComplete = (data) => {
            console.log('Act 4 complete:', data);
        };
    }

    /**
     * Initialize Act 5
     */
    _initAct5() {
        if (!this.act5) {
            this.act5 = new Act5Governor();
        }
        this.act5.init('act5-canvas');

        this.act5.onComplete = (data) => {
            console.log('Act 5 complete:', data);
        };
    }

    /**
     * Show a specific section
     */
    _showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
        }
    }

    /**
     * Hide all sections
     */
    _hideAllSections() {
        const sections = [
            'intro',
            'act1', 'act1-debrief',
            'act2', 'act2-quiz', 'act2-debrief',
            'intermission',
            'act3', 'act3-debrief',
            'act4', 'act4-debrief',
            'act5', 'final-debrief'
        ];

        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
            }
        });
    }

    /**
     * Stop all running acts
     */
    _stopAllActs() {
        if (this.act1) this.act1.stop();
        if (this.act2) this.act2.stop();
        if (this.act3) this.act3.stop();
        if (this.act4) this.act4.stop();
        if (this.act5) this.act5.stop();
    }

    /**
     * Restart the entire experience
     */
    _restart() {
        this._stopAllActs();

        // Reset all acts
        if (this.act1) this.act1.reset();
        if (this.act2) this.act2.reset();
        if (this.act2Quiz) this.act2Quiz.reset();
        if (this.act3) this.act3.reset();
        if (this.act4) this.act4.reset();
        if (this.act5) this.act5.reset();

        // Reset state
        this.currentAct = 0;

        // Show intro
        this._hideAllSections();
        this._showSection('intro');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Clean up
     */
    destroy() {
        this._stopAllActs();
        if (this.act1) this.act1.destroy();
        if (this.act2) this.act2.destroy();
        if (this.act3) this.act3.destroy();
        if (this.act4) this.act4.destroy();
        if (this.act5) this.act5.destroy();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ResilienceLandscapesApp();
    window.app.init();
});

// Export for debugging
window.ResilienceLandscapesApp = ResilienceLandscapesApp;
