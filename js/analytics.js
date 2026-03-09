/**
 * Analytics tracking for Resilience Landscapes
 * Tracks screen views and user interactions via Google Analytics 4
 */
const Analytics = {
    currentSection: null,
    sectionStartTime: null,

    /**
     * Track screen/section views
     * @param {string} screenId - The screen identifier
     * @param {number|null} actNumber - Optional act number for context
     */
    trackScreen(screenId, actNumber = null) {
        const now = Date.now();

        // 1. Calculate time spent on the PREVIOUS section
        if (this.currentSection && this.sectionStartTime) {
            const timeSpentSecs = Math.round((now - this.sectionStartTime) / 1000);
            if (timeSpentSecs > 0) {
                this.trackEvent('section_time_spent', {
                    section_name: this.currentSection,
                    time_spent_seconds: timeSpentSecs,
                    // Use GA4's built-in parameter for tracking engagement time
                    engagement_time_msec: (now - this.sectionStartTime)
                });
            }
        }

        // 2. Start tracking the NEW section
        this.currentSection = screenId;
        this.sectionStartTime = now;

        if (typeof gtag === 'function') {
            const params = {
                // Send standard web tracking parameters instead of app parameters
                page_title: `Section: ${screenId}`,
                page_path: `/${screenId}`,
                timestamp: new Date().toISOString()
            };
            if (actNumber !== null) {
                params.act = actNumber;
            }

            // Send virtual page_view instead of screen_view
            gtag('event', 'page_view', params);
            console.log('[Analytics] Section Started:', screenId);
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
