/**
 * Analytics tracking for Resilience Landscapes
 *
 * Treats each stage (intro, act1, act2-s1, ...) as a distinct GA4 "page" by
 * giving it its own `page_location` (origin + pathname + `#/<stageId>`).
 * Emits a `user_engagement` event with `engagement_time_msec` whenever a stage
 * is left, which is the GA4-native signal that feeds "Average engagement time
 * per active user" in Reports → Engagement → Pages and screens.
 *
 * Foreground-only: the Page Visibility API pauses the per-stage clock while
 * the tab is hidden, so idle time does not inflate stage durations.
 */
const Analytics = {
    currentSection: null,
    sectionStartTime: null,
    accumulatedMsec: 0,
    _visibilityListenerAttached: false,

    _locationFor(sectionId) {
        const { origin, pathname } = window.location;
        return `${origin}${pathname}#/${sectionId}`;
    },

    _onVisibilityChange() {
        if (!this.currentSection) return;
        const now = Date.now();
        if (document.visibilityState === 'hidden' && this.sectionStartTime) {
            this.accumulatedMsec += now - this.sectionStartTime;
            this.sectionStartTime = null;
        } else if (document.visibilityState === 'visible' && !this.sectionStartTime) {
            this.sectionStartTime = now;
        }
    },

    _ensureVisibilityListener() {
        if (this._visibilityListenerAttached) return;
        this._visibilityListenerAttached = true;
        document.addEventListener('visibilitychange', () => this._onVisibilityChange());
        window.addEventListener('pagehide', () => this._flushCurrent());
    },

    _flushCurrent() {
        if (!this.currentSection) return;
        const now = Date.now();
        if (this.sectionStartTime) {
            this.accumulatedMsec += now - this.sectionStartTime;
            this.sectionStartTime = null;
        }
        const msec = this.accumulatedMsec;
        if (msec > 0 && typeof gtag === 'function') {
            gtag('event', 'user_engagement', {
                engagement_time_msec: msec,
                page_location: this._locationFor(this.currentSection),
                page_title: `Section: ${this.currentSection}`
            });
        }
    },

    /**
     * Track entering a stage. Call once per stage transition.
     * @param {string} sectionId - DOM id of the section (e.g. 'act2-s1')
     * @param {number|null} actNumber - Optional act context for filtering
     */
    trackScreen(sectionId, actNumber = null) {
        this._ensureVisibilityListener();
        this._flushCurrent();
        const prevSection = this.currentSection;

        this.currentSection = sectionId;
        this.sectionStartTime = Date.now();
        this.accumulatedMsec = 0;

        if (typeof gtag !== 'function') return;
        const params = {
            page_title: `Section: ${sectionId}`,
            page_location: this._locationFor(sectionId),
            page_referrer: prevSection ? this._locationFor(prevSection) : document.referrer
        };
        if (actNumber !== null) params.act = actNumber;
        gtag('event', 'page_view', params);
        console.log('[Analytics] Section:', sectionId);
    },

    /**
     * Track a custom event (button clicks, completions, honeypot hits, ...).
     */
    trackEvent(eventName, params = {}) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, params);
            console.log('[Analytics] Event:', eventName, params);
        }
    },

    trackActComplete(actNumber, data = {}) {
        this.trackEvent('act_complete', { act: actNumber, ...data });
    }
};

window.Analytics = Analytics;
