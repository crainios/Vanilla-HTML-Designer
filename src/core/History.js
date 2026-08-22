export default class History {
    constructor(limit = 100) {
        this.limit = limit;
        this.past = [];
        this.future = [];
    }

    push(state) {
        this.past.push(structuredClone(state));

        if (this.past.length > this.limit) {
            this.past.shift();
        }

        this.future = [];
    }

    undo(currentState) {
        if (!this.past.length) {
            return null;
        }

        this.future.push(structuredClone(currentState));
        return this.past.pop();
    }

    redo(currentState) {
        if (!this.future.length) {
            return null;
        }

        this.past.push(structuredClone(currentState));
        return this.future.pop();
    }

    clear() {
        this.past = [];
        this.future = [];
    }

    canUndo() {
        return this.past.length > 0;
    }

    canRedo() {
        return this.future.length > 0;
    }
}
