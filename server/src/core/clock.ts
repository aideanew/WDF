/** 唯一时间来源：便于测试注入。 */
export let now = (): number => Date.now();
export function setClock(fn: () => number): void { now = fn; }
