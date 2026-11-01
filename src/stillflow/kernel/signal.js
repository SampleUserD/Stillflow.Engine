export class Signal {
    _subscribers = new Set();
    subscribe(site) {
        this._subscribers.add(site);
        return () => this._subscribers.delete(site);
    }
    dispatch(payload) {
        for (const subscriber of this._subscribers) {
            subscriber(payload);
        }
    }
}
