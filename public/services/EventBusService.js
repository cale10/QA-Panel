// EventBusService class definition
class EventBusService {
    constructor() {
        if (EventBusService.instance) {
            return EventBusService.instance;
        }
        EventBusService.instance = this;

        this.listeners = new Map();
        this.history = [];
        this.maxHistorySize = 100;

        // Initialize after debugLogger is ready
        if (window.debugLogger) {
            window.debugLogger.info('event_bus', 'Event bus service initialized');
        }
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function} callback - Event handler
     * @param {object} options - Subscription options
     * @param {boolean} options.once - Only handle event once
     * @param {boolean} options.immediate - Handle past events immediately
     * @returns {function} Unsubscribe function
     */
    subscribe(event, callback, options = {}) {
        const {
            once = false,
            immediate = false
        } = options;

        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        const subscription = {
            callback,
            once
        };

        this.listeners.get(event).add(subscription);

        // Handle past events if immediate is true
        if (immediate) {
            const pastEvents = this.history.filter(h => h.event === event);
            pastEvents.forEach(e => callback(e.data));
        }

        // Return unsubscribe function
        return () => {
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                eventListeners.delete(subscription);
                if (eventListeners.size === 0) {
                    this.listeners.delete(event);
                }
            }
        };
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {function} callback - Event handler
     * @returns {function} Unsubscribe function
     */
    once(event, callback) {
        return this.subscribe(event, callback, { once: true });
    }

    /**
     * Publish an event
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    publish(event, data) {
        // Add to history
        this.history.push({
            event,
            data,
            timestamp: Date.now()
        });

        // Trim history if needed
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }

        // Notify listeners
        if (this.listeners.has(event)) {
            const eventListeners = this.listeners.get(event);
            const completedSubscriptions = new Set();

            eventListeners.forEach(subscription => {
                try {
                    subscription.callback(data);
                    if (subscription.once) {
                        completedSubscriptions.add(subscription);
                    }
                } catch (error) {
                    if (window.debugLogger) {
                        window.debugLogger.error('event_bus', `Error in event handler for ${event}`, error);
                    } else {
                        console.error(`[EventBus] Error in event handler for ${event}:`, error);
                    }
                }
            });

            // Remove completed one-time subscriptions
            completedSubscriptions.forEach(subscription => {
                eventListeners.delete(subscription);
            });

            // Clean up empty event
            if (eventListeners.size === 0) {
                this.listeners.delete(event);
            }
        }

        // Log event
        if (window.debugLogger) {
            window.debugLogger.debug('event_bus', `Event published: ${event}`, {
                event,
                data,
                listeners: this.listeners.get(event)?.size || 0
            });
        }
    }

    /**
     * Get event history
     * @param {object} options - Filter options
     * @param {string} options.event - Filter by event name
     * @param {number} options.since - Filter by timestamp
     * @param {number} options.limit - Limit number of results
     * @returns {array} Event history
     */
    getHistory(options = {}) {
        const {
            event,
            since,
            limit
        } = options;

        let history = [...this.history];

        // Filter by event
        if (event) {
            history = history.filter(h => h.event === event);
        }

        // Filter by timestamp
        if (since) {
            history = history.filter(h => h.timestamp >= since);
        }

        // Apply limit
        if (limit) {
            history = history.slice(-limit);
        }

        return history;
    }

    /**
     * Clear event history
     * @param {string} event - Optional event name to clear
     */
    clearHistory(event) {
        if (event) {
            this.history = this.history.filter(h => h.event !== event);
        } else {
            this.history = [];
        }
    }

    /**
     * Get active subscriptions
     * @param {string} event - Optional event name to filter
     * @returns {object} Subscription counts by event
     */
    getSubscriptions(event) {
        if (event) {
            return {
                [event]: this.listeners.get(event)?.size || 0
            };
        }

        const subscriptions = {};
        this.listeners.forEach((listeners, event) => {
            subscriptions[event] = listeners.size;
        });
        return subscriptions;
    }

    /**
     * Remove all subscriptions
     * @param {string} event - Optional event name to clear
     */
    clearSubscriptions(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get event bus statistics
     * @returns {object} Statistics about the event bus
     */
    getStats() {
        return {
            events: this.listeners.size,
            subscriptions: Array.from(this.listeners.values())
                .reduce((total, listeners) => total + listeners.size, 0),
            history: this.history.length,
            lastEvent: this.history[this.history.length - 1]?.timestamp || null
        };
    }

    static getInstance() {
        if (!EventBusService.instance) {
            EventBusService.instance = new EventBusService();
        }
        return EventBusService.instance;
    }
}

// Create and export both class and instance
window.EventBusService = EventBusService;
window.eventBusService = EventBusService.getInstance();
