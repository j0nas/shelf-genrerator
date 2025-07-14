/**
 * DOM utility functions with TypeScript generics
 * Avoids the need for manual `as` casts everywhere
 */

export function getElement<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

export function querySelector<T extends Element>(selector: string): T | null {
    return document.querySelector(selector) as T | null;
}

export function querySelectorAll<T extends Element>(selector: string): NodeListOf<T> {
    return document.querySelectorAll(selector) as NodeListOf<T>;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: ElementCreationOptions
): HTMLElementTagNameMap[K] {
    return document.createElement(tagName, options);
}

// Event target utility for form events
export function getEventTarget<T extends HTMLElement>(event: Event): T | null {
    return event.target as T | null;
}

// Type-safe event value extraction
export function getInputValue(event: Event): string {
    const target = getEventTarget<HTMLInputElement>(event);
    return target?.value || '';
}

export function getSelectValue(event: Event): string {
    const target = getEventTarget<HTMLSelectElement>(event);
    return target?.value || '';
}

export function getCheckboxChecked(event: Event): boolean {
    const target = getEventTarget<HTMLInputElement>(event);
    return target?.checked || false;
}

// Temporary utility for quick DOM element casting during migration
// TODO: Replace with proper element-specific getters
export function asInput(element: HTMLElement | null): HTMLInputElement | null {
    return element as HTMLInputElement | null;
}

export function asSelect(element: HTMLElement | null): HTMLSelectElement | null {
    return element as HTMLSelectElement | null;
}

export function asChecked(element: Element | null): HTMLInputElement | null {
    return element as HTMLInputElement | null;
}