import * as fontData from "./obf/data";
import {BitmapFont} from "./bitmap";

function createFont(documentAccessor: any): BitmapFont {
    return new BitmapFont(documentAccessor, fontData);
}

export function bindObfuscatedText(container: HTMLElement, debug: (msg: string) => void): void {
    const font = createFont(container);
    if (!font.canRender) return;
    if (!("requestAnimationFrame" in font.window)) return;
    // After this point, we are almost definitely in a browser. Thus, browser APIs are used below.

    const nodes = container.childNodes;
    if (nodes.length === 0) return;

    const out: Node[] = [];
    const canvases: HTMLCanvasElement[] = [];
    for (let i=0; i < nodes.length; i++) {
        const node = nodes[i];
        const append = ((element: Node) => out.push(element));

        if (node.nodeType === Node.TEXT_NODE) {
            canvases.push(...bindObfuscatedText0(font, node.textContent || "", append));
            continue;
        } else if (node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLElement) {
            bindObfuscatedText(node, debug);
        }
        append(node);
    }

    if ("replaceChildren" in container) {
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren
        (container as unknown as { replaceChildren: ((...nodes: Node[]) => void) })
            .replaceChildren(...out);
    } else {
        (container as unknown as HTMLElement).innerHTML = "";
        (container as unknown as HTMLElement).append(...out);
    }

    const colors: string[] = new Array(canvases.length);
    for (let i=0; i < canvases.length; i++) colors[i] = font.window.getComputedStyle(canvases[i]).color;

    let lastFrame = 0;
    const targetDeltaThreshold = 20; // Delta to tend towards
    let currentDeltaThreshold = targetDeltaThreshold;
    function frame() {
        const now = font.window.performance.now();
        const elapsed = (now - lastFrame);
        if (elapsed >= currentDeltaThreshold) {
            if (lastFrame !== 0) {
                // Adjust update rate for lag & lag recovery
                const changeSpeed = Math.pow(Math.min(now / 400, 1), 2);
                if (elapsed >= (currentDeltaThreshold * 1.5)) {
                    // Lag
                    currentDeltaThreshold = (currentDeltaThreshold * (1 - changeSpeed * 2)) + (elapsed * changeSpeed * 2);
                } else {
                    // Lag recovery
                    currentDeltaThreshold = (currentDeltaThreshold * (1 - changeSpeed)) + (targetDeltaThreshold * changeSpeed);
                }
            }
            lastFrame = now;

            let promises: Promise<void>[] = new Array(canvases.length);
            for (let i=0; i < canvases.length; i++) {
                const canvas = canvases[i];
                if (i === 0 && (!canvas.isConnected)) return;
                promises[i] = font.render(canvas, Math.floor(Math.random() * font.glyphCount), colors[i]);
            }

            Promise.all(promises).then(() => {
                font.window.requestAnimationFrame(frame);
            }).catch(console.error);
            return;
        }
        font.window.requestAnimationFrame(frame);
    }
    frame();
}

function bindObfuscatedText0(font: BitmapFont, text: string, append: (element: HTMLElement) => void): HTMLCanvasElement[] {
    const canvases: HTMLCanvasElement[] = new Array(text.length);
    let canvasCount = 0;
    for (let i=0; i < text.length; i++) {
        if (text.charCodeAt(i) === 32) { // SPACE
            const space = font.document.createElement("span");
            space.innerText = "\xa0";
            append(space);
        } else {
            const canvas = font.document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            canvas.style.height = "0.9em";
            canvas.style.width = "0.9em";
            canvas.style.display = "inline";
            canvas.style.verticalAlign = "bottom";
            canvas.style.imageRendering = "pixelated";
            if (font.window.getComputedStyle(canvas).imageRendering !== "pixelated")
                canvas.style.imageRendering = "crisp-edges";
            canvas.setAttribute("aria-label", text.charAt(i));
            append(canvas);
            canvases[canvasCount++] = canvas;
        }
    }
    canvases.length = canvasCount;
    return canvases;
}
