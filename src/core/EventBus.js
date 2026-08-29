export default class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('Vanilla HTML Designer: event callback must be a function.');
        }

        const name = String(event);
        const listeners = this.listeners.get(name) ?? new Set();
        listeners.add(callback);
        this.listeners.set(name, listeners);

        return () => this.off(name, callback);
    }

    off(event, callback) {
        const name = String(event);
        const listeners = this.listeners.get(name);

        if (!listeners) {
            return false;
        }

        const removed = listeners.delete(callback);

        if (!listeners.size) {
            this.listeners.delete(name);
        }

        return removed;
    }

    emit(event, detail = {}) {
        const listeners = this.listeners.get(String(event));

        if (!listeners?.size) {
            return;
        }

        for (const callback of [...listeners]) {
            try {
                callback(detail);
            } catch (error) {
                console.error(
                    `Vanilla HTML Designer: error in "${event}" event listener.`,
                    error
                );
            }
        }
    }

    clear() {
        this.listeners.clear();
    }
}
