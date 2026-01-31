/**
 * Analytics tracking for Resilience Landscapes
 * Tracks screen views and user interactions via Google Analytics 4
 */
const Analytics = {
    /**
     * Track screen/section views
     * @param {string} screenId - The screen identifier
     * @param {number|null} actNumber - Optional act number for context
     */
    trackScreen(screenId, actNumber = null) {
        if (typeof gtag === 'function') {
            const params = {
                screen_name: screenId,
                timestamp: new Date().toISOString()
            };
            if (actNumber !== null) {
                params.act = actNumber;
            }
            gtag('event', 'screen_view', params);
            console.log('[Analytics] Screen:', screenId, actNumber ? `(Act ${actNumber})` : '');
        }
    },

    /**
     * Track custom events (button clicks, completions, etc.)
     * @param {string} eventName - Name of the event
     * @param {Object} params - Additional event parameters
     */
    trackEvent(eventName, params = {}) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, params);
            console.log('[Analytics] Event:', eventName, params);
        }
    },

    /**
     * Track when user completes an act
     * @param {number} actNumber - The completed act
     * @param {Object} data - Additional completion data
     */
    trackActComplete(actNumber, data = {}) {
        this.trackEvent('act_complete', {
            act: actNumber,
            ...data
        });
    }
};

// Make available globally
window.Analytics = Analytics;
