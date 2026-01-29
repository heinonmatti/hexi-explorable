
class Act2Quiz {
    constructor() {
        this.container = document.getElementById('act2-quiz');
    }

    init() {
        if (!this.container) return;
        console.log('Act 2 Quiz initialized');
        this._setupHandlers();
    }

    _setupHandlers() {
        const questions = this.container.querySelectorAll('.quiz-question');
        this.totalQuestions = questions.length;
        this.answeredCount = 0;

        questions.forEach(q => {
            const btns = q.querySelectorAll('.quiz-btn');
            btns.forEach(btn => {
                btn.onclick = (e) => this._handleAnswer(e, q);
            });
        });
    }

    _handleAnswer(e, questionEl) {
        const btn = e.target;
        const answer = btn.dataset.answer;
        const correct = questionEl.dataset.correct;
        const feedbackEl = questionEl.querySelector('.feedback');
        const btns = questionEl.querySelectorAll('.quiz-btn');

        // Clear previous incorrect markers in this question
        btns.forEach(b => b.classList.remove('incorrect'));

        if (answer === correct) {
            // Disable buttons in this question ONLY when correct
            btns.forEach(b => b.disabled = true);
            btn.classList.add('correct');
            feedbackEl.textContent = "Correct! " + this._getExplanation(answer);
            feedbackEl.className = 'feedback success';
            this.answeredCount++;
            this._checkCompletion();
        } else {
            btn.classList.add('incorrect');
            feedbackEl.textContent = "Perhaps... But there's a better answer. Try again!";
            feedbackEl.className = 'feedback error';
        }
    }

    _getExplanation(type) {
        if (type === 'n') return "That was N-Tipping (a shock to a stable system).";
        if (type === 'b') return "That was B-Tipping (the system's resilience eroded).";
        if (type === 'nb') return "That was both: slow erosion of resilience (B-Tipping) followed by a triggering shock (N-Tipping).";
        return "";
    }

    _checkCompletion() {
        if (this.answeredCount >= this.totalQuestions) {
            const continueBtn = document.getElementById('continue-to-act2-debrief');
            if (continueBtn) {
                continueBtn.style.display = 'block';
                continueBtn.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
}

window.Act2Quiz = Act2Quiz;
