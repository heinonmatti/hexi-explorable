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
        // Initialize Act Navigation (Jump to Act)
        const navBtns = document.querySelectorAll('.nav-link-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetAct = btn.dataset.act;
                this.showAct(targetAct);
            });
        });

        // Initialize Continue Buttons
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', this._onStartClick);
        }

        // Continue buttons
        const continueToIntermission = document.getElementById('continue-to-intermission');
        if (continueToIntermission) {
            continueToIntermission.addEventListener('click', () => {
                this._startAct(2);
            });
        }

        const sendFeedbackBtn = document.getElementById('send-feedback-btn');
        if (sendFeedbackBtn) {
            sendFeedbackBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const form = document.querySelector('form[name="act1-feedback"]');

                // Honeypot check - if filled, silently abort (don't alert bots)
                const honeypot = document.getElementById('website');
                if (honeypot && honeypot.value) {
                    console.log('Bot detected via honeypot');
                    // Show fake success to not alert bot
                    const thanksEl = document.getElementById('feedback-thanks');
                    if (thanksEl) thanksEl.style.display = 'block';
                    sendFeedbackBtn.disabled = true;
                    sendFeedbackBtn.textContent = 'Shared';
                    return;
                }

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

        const continueToAct2 = document.getElementById('continue-to-act2');
        if (continueToAct2) {
            continueToAct2.addEventListener('click', () => {
                this._startAct(2);
            });
        }

        const continueToAct2Debrief = document.getElementById('continue-to-act2-debrief');
        if (continueToAct2Debrief) {
            continueToAct2Debrief.addEventListener('click', () => {
                this._showSection('act2-debrief');
            });
        }

        // Act 2 feedback form
        const sendAct2FeedbackBtn = document.getElementById('send-act2-feedback');
        if (sendAct2FeedbackBtn) {
            sendAct2FeedbackBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const form = document.querySelector('form[name="act2-feedback"]');

                // Honeypot check
                const honeypot = document.getElementById('website-act2');
                if (honeypot && honeypot.value) {
                    console.log('Bot detected via honeypot (act2)');
                    const thanksEl = document.getElementById('act2-feedback-thanks');
                    if (thanksEl) thanksEl.style.display = 'block';
                    sendAct2FeedbackBtn.disabled = true;
                    sendAct2FeedbackBtn.textContent = 'Shared';
                    return;
                }

                // Submit to Netlify
                fetch("/", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(new FormData(form)).toString(),
                })
                    .then(() => {
                        console.log('Act 2 Feedback submitted');
                        const thanksEl = document.getElementById('act2-feedback-thanks');
                        if (thanksEl) thanksEl.style.display = 'block';
                        sendAct2FeedbackBtn.disabled = true;
                        sendAct2FeedbackBtn.textContent = 'Shared';
                    })
                    .catch((error) => console.error('Feedback submission error:', error));
            });
        }

        // Act 2 Reflection (Sensitivity Demo)
        const reflectForm = document.querySelector('form[name="act2-reflection"]');
        if (reflectForm) {
            const submitBtn = reflectForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.addEventListener('click', (e) => {
                    e.preventDefault();

                    // Submit to Netlify
                    fetch("/", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams(new FormData(reflectForm)).toString(),
                    })
                        .then(() => {
                            console.log('Act 2 Reflection submitted');
                            // Move to Quiz
                            this._hideAllSections();
                            this._showSection('act2-quiz');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        })
                        .catch((error) => {
                            console.error('Feedback submission error:', error);
                            // Move on anyway
                            this._hideAllSections();
                            this._showSection('act2-quiz');
                        });
                });
            }
        }

        const continueToAct3 = document.getElementById('continue-to-act3');
        if (continueToAct3) {
            continueToAct3.addEventListener('click', () => {
                this._submitAct2Feedback();
                this._startAct(3);
            });
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

        const restartBtnEnd = document.getElementById('restart-btn-end');
        if (restartBtnEnd) {
            restartBtnEnd.addEventListener('click', () => this._restart());
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
                this._initAct2(1); // Default to stage 1
                break;
            case 3:
                this._showSection('end-screen');
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

            // Track attempts in localStorage
            let attempts = parseInt(localStorage.getItem('act1_attempts') || '0');
            attempts++;
            localStorage.setItem('act1_attempts', attempts);

            // Populate hidden form fields for Netlify
            const attemptsField = document.getElementById('stats-attempts');
            const nudgesOutField = document.getElementById('stats-nudges-out');

            if (attemptsField) attemptsField.value = attempts;
            if (nudgesOutField) nudgesOutField.value = data.nudgesOut || 0;
        };
    }

    /**
     * Initialize Act 2
     */
    _initAct2(stage = 1) {
        if (!this.act2) {
            this.act2 = new Act2Tipping();
        }
        this.act2.init('act2-canvas', stage);

        this.act2.onBothTipped = () => {
            // Act 2 already handles showing the next section usually
            // but we can ensure it here
        };

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
     * Hide all app sections (acts, debriefs, etc)
     */
    _hideAllSections() {
        const sections = document.querySelectorAll('.act-section, .debrief-section, .quiz-section, .narrative-section');
        sections.forEach(el => {
            el.style.display = 'none';
        });
    }

    /**
     * Automatically submit any filled feedback forms for Act 2
     */
    _submitAct2Feedback() {
        console.log('📤 Preparing automatic feedback submission...');
        const forms = [
            'form[name="act2-reflection"]',
            'form[name="act2-feedback"]'
        ];

        forms.forEach(selector => {
            const form = document.querySelector(selector);
            if (!form) return;

            // Check if there's actual data to submit
            const formData = new FormData(form);
            let hasData = false;
            for (let [name, value] of formData.entries()) {
                // Ignore technical/hidden fields and empty strings
                if (name !== 'form-name' &&
                    name !== 'act' &&
                    name !== 'website' &&
                    name !== 'cant_think_of_anything' &&
                    value.trim() !== '') {
                    hasData = true;
                    break;
                }
                // Handle checkbox explicitly if needed
                if (name === 'cant_think_of_anything' && value === 'yes') {
                    hasData = true;
                    break;
                }
            }

            if (!hasData) return;

            fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(formData).toString(),
            })
                .then(() => console.log(`✅ Feedback from ${selector} submitted`))
                .catch((error) => console.error(`❌ Submission error for ${selector}:`, error));
        });
    }

    /**
     * Stop all running acts
     */
    _stopAllActs() {
        if (this.act1) this.act1.stop();
        if (this.act2) this.act2.stop();
    }

    /**
     * Show a specific act and hide others
     */
    showAct(actId) {
        console.log('Jump to act stage:', actId);
        this._stopAllActs();
        this._hideAllSections();

        if (actId === 'act1') {
            this._showSection('act1');
            this._initAct1();
        } else if (actId.startsWith('act2-s')) {
            const stage = parseInt(actId.substring(6));
            this._showSection('act2');
            this._initAct2(stage);
        }
    }

    /**
     * Restart the entire experience
     */
    _restart() {
        this._stopAllActs();

        // Reset all acts
        if (this.act1) this.act1.reset();
        if (this.act2) this.act2.reset();

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
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ResilienceLandscapesApp();
    window.app.init();
});

// Export for debugging
window.ResilienceLandscapesApp = ResilienceLandscapesApp;
