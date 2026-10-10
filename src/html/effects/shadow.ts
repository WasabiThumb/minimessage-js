import type { DomEffect } from "../effects";

const DEFAULT_SHADOW_OFFSET = "0.10714286em";

class ShadowDomEffectImpl implements ShadowDomEffect {
  apply(element: Element, color: string): void {
    const images = element.querySelectorAll<HTMLImageElement>("img");
    const filter = `drop-shadow(${DEFAULT_SHADOW_OFFSET} ${DEFAULT_SHADOW_OFFSET} ${color})`;
    for (const image of images) {
      // Skip images that are inside a more specific nested shadow element
      // those will be (or have already been) handled by that inner element's
      // own apply() call with the correct color
      if (this._hasNestedShadowAncestor(image, element)) continue;

      // Append to any existing filter (e.g. tint) rather than clobber it
      const existing = image.style.filter;
      if (existing) {
        if (!existing.includes("drop-shadow")) {
          image.style.filter = `${existing} ${filter}`;
        }
      } else {
        image.style.filter = filter;
      }
    }
  }

  /**
   * Returns true if any ancestor of `element`, up to but not including
   * `boundary`, carries a `data-mm-shadow` attribute of its own
   * Meaning that ancestor is a more specific shadow scope that owns this image
   */
  private _hasNestedShadowAncestor(
    element: Element,
    boundary: Element,
  ): boolean {
    let current = element.parentElement;
    while (current !== null && current !== boundary) {
      if (current.hasAttribute("data-mm-shadow")) return true;
      current = current.parentElement;
    }
    return false;
  }

  serialize(color: string): string {
    return color;
  }

  deserialize(value: string): string {
    return value;
  }
}

export type ShadowDomEffect = DomEffect<string>;

export namespace ShadowDomEffect {
  export const TOKEN = "shadow";
  export const INSTANCE: ShadowDomEffect = new ShadowDomEffectImpl();
}
