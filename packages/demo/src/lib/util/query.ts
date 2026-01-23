
export function findElementsByProperty<K extends string>(
    parent: HTMLElement,
    propertyName: string,
    init: Record<K, string>
): Record<K, HTMLElement> {
    const ret: Partial<Record<K, HTMLElement>> = {};
    for (const key in init) {
        const value = init[key];
        const element = parent.querySelector<HTMLElement>(`[${propertyName}="${value}"]`);
        if (!element) throw new Error(`Failed to locate element with ${propertyName}="${value}"`);
        ret[key] = element;
    }
    return ret as Record<K, HTMLElement>;
}
