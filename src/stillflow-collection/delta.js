export function clear_delta(delta) {
    delta.addes = 0;
    delta.swaps.clear();
    delta.updates.clear();
    delta.removes.clear();
    delta.replaces = false;
    delta.clears = false;
}
export function copy_delta(delta) {
    return {
        addes: delta.addes,
        swaps: new Map(delta.swaps),
        updates: new Set(delta.updates),
        removes: new Set(delta.removes),
        replaces: delta.replaces,
        clears: delta.clears
    };
}
