// Used by the web demo to make the color wheel & color presets work. The submit action is handled by widgets.js

/**
 * @typedef { {container: HTMLElement, canvas: HTMLCanvasElement, presets: HTMLElement, code: HTMLInputElement} } ModalParts
 */

((window, bind) => {
    const document = window.document;
    window.addEventListener("DOMContentLoaded", () => {
        const modal = document.querySelector("#colors-modal");
        if (!modal) return;
        let ret = { container: modal };
        for (const k of ["canvas", "presets", "code"]) {
            let sub = modal.querySelector(`[data-role="${k}"]`);
            if (!sub) return;
            ret[k] = sub;
        }
        bind(ret);
    });
})(window, /** @param parts {ModalParts} */ (parts) => {
    const { container, canvas, presets, code } = parts;

    // Make the container disappear when clicked out
    container.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
    });
    document.body.addEventListener("pointerdown", (e) => {
        container.classList.remove("show");
    });

    /**
     * @param code {number} Char code (ASCII 0-9, A-F, a-f)
     * @return {number} Nibble (0-15)
     */
    function hexCharCode2Nibble(code) {
        if (48 <= code && code <= 57) return (code - 48);
        if (97 <= code && code <= 102) return (code - 87);
        if (65 <= code && code <= 70) return (code - 55);
        throw new Error("Character " + String.fromCharCode(code) + " is not valid hexadecimal");
    }

    /**
     * @param nibble {number} Nibble (0-15)
     * @return {number} Char code (ASCII 0-9, A-F, a-f)
     */
    function nibble2HexCharCode(nibble) {
        if (nibble < 10) return 48 + nibble;
        return nibble + 87;
    }

    /**
     * @type {{hasHSV: boolean, hasRGB: boolean, hsv: [number, number, number], rgb: [number, number, number]}}
     */
    let currentColor = {
        rgb: [255, 255, 255], // 0 -> 255
        hasRGB: true,
        hsv: [0, 0, 1], // 0 -> 1
        hasHSV: true
    };

    /**
     * @param r {number}
     * @param g {number}
     * @param b {number}
     */
    function setCurrentColorAsRGB(r, g, b) {
        currentColor.rgb = [r, g, b];
        currentColor.hasHSV = !(currentColor.hasRGB = true);
    }

    /**
     * @return {[number, number, number]}
     */
    function getCurrentColorAsRGB() {
        if (currentColor.hasRGB) return currentColor.rgb;
        const [ h, s, v ] = currentColor.hsv;
        // https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
        let r, g, b, i, f, p, q, t;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        currentColor.hasRGB = true;
        return (currentColor.rgb = [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ]);
    }

    /**
     * @param h {number}
     * @param s {number}
     * @param v {number}
     */
    function setCurrentColorAsHSV(h, s, v) {
        currentColor.hsv = [h, s, v];
        currentColor.hasRGB = !(currentColor.hasHSV = true);
        const [r, g, b] = getCurrentColorAsRGB();
        code.value = String.fromCharCode(
            nibble2HexCharCode(r >> 4), nibble2HexCharCode(r & 0xF),
            nibble2HexCharCode(g >> 4), nibble2HexCharCode(g & 0xF),
            nibble2HexCharCode(b >> 4), nibble2HexCharCode(b & 0xF)
        );
        code.classList.remove("invalid");
        code.removeAttribute("data-color-name");
    }

    /**
     * @return {[number, number, number]}
     */
    function getCurrentColorAsHSV() {
        if (currentColor.hasHSV) return currentColor.hsv;
        let [ r, g, b ] = currentColor.rgb;

        // https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
        let max = Math.max(r, g, b), min = Math.min(r, g, b),
            d = max - min,
            h,
            s = (max === 0 ? 0 : d / max),
            v = max / 255;

        switch (max) {
            case min: h = 0; break;
            case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
            case g: h = (b - r) + d * 2; h /= 6 * d; break;
            case b: h = (r - g) + d * 4; h /= 6 * d; break;
        }

        currentColor.hasHSV = true;
        return (currentColor.hsv = [h, s, v]);
    }

    const ctx = canvas.getContext("2d");
    const cw = canvas.width;
    const ch = canvas.height;
    const cc = Math.round(cw / 2);
    const grad1 = (() => {
        const grad = ctx.createConicGradient(0, cc, cc);
        const steps = 32;
        let rgb;
        for (let i=0; i < steps; i++) {
            const hue = (i / steps);
            setCurrentColorAsHSV(hue, 1, 1);
            rgb = getCurrentColorAsRGB();
            grad.addColorStop(hue, `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
        }
        code.value = "ffffff";
        code.classList.remove("invalid");
        code.setAttribute("data-color-name", "white");
        setCurrentColorAsRGB(255, 255, 255);
        return grad;
    })();
    const grad2 = (() => {
        const grad = ctx.createRadialGradient(cc, cc, 0, cc * 0.9, cc, cc * 0.9);
        grad.addColorStop(0, `#FFFF`);
        grad.addColorStop(1, `#FFF0`);
        return grad;
    })();

    function drawCanvas() {
        // Draw the hue circle & handle
        ctx.clearRect(0, 0, cw, ch);
        function drawCircle() {
            ctx.beginPath();
            ctx.ellipse(cc, cc, cc * 0.9, cc * 0.9, 0, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = grad1;
        drawCircle();
        ctx.fillStyle = grad2;
        drawCircle();

        let [h, s, v] = getCurrentColorAsHSV();
        let [r, g, b] = getCurrentColorAsRGB();
        if (v < 1) {
            ctx.fillStyle = `rgba(0, 0, 0, ${1 - v})`;
            drawCircle();
        }
        h *= Math.PI * 2;

        const x = (Math.cos(h) * s * cc * 0.9) + cc;
        const y = (Math.sin(h) * s * cc * 0.9) + cc;
        ctx.strokeStyle = v < 0.5 ? "#fff" : "#000";
        ctx.lineWidth = (cc * 0.0125);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.ellipse(x, y, cc * 0.075, cc * 0.075, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw the value slider
        const sx = (cw * 0.1);
        const sy = cw + ((ch - cw) * 0.2);
        const sw = (cw * 0.8);
        const sh = ((ch - cw) * 0.6);
        ctx.strokeStyle = `#000`;
        ctx.fillStyle = `hsl(${(h / 6) * 360}deg ${s * 100}% ${(s * (s * 50)) + ((1 - s) * 100)}%)`;
        ctx.beginPath();
        ctx.rect(sx, sy, sw, sh);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        const grad = ctx.createLinearGradient(sx, sy, sx + sw, sy);
        grad.addColorStop(0, `#000F`);
        grad.addColorStop(1, `#0000`);
        ctx.fillStyle = grad;
        ctx.fillRect(sx, sy, sw, sh);

        const hx = (sx + (sw * v));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.rect(hx - (cw * 0.025), sy - (sh * 0.05), cw * 0.05, sh * 1.1);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    drawCanvas();

    const NO_POINTER = Symbol();
    /** @type {symbol | number} */
    let capturedPointer = NO_POINTER;
    let usingSlider = false;
    function updateCanvasPointer(x, y) {
        const rect = canvas.getBoundingClientRect();
        if (usingSlider) {
            // Handle the value slider
            const v = Math.min(Math.max((x - (rect.left + (rect.width * 0.1))) / (rect.width * 0.8), 0), 1);
            const [h, s] = getCurrentColorAsHSV();
            setCurrentColorAsHSV(h, s, v);
        } else {
            const rad = (rect.width / 2);
            const cx = (rect.left + rad);
            const cy = (rect.top + rad);
            const dx = x - cx;
            const dy = y - cy;
            let mag = Math.pow(dx / (rad * 0.9), 2) + Math.pow(dy / (rad * 0.9), 2);
            if (mag < 1e-6) {
                setCurrentColorAsHSV(0, 0, getCurrentColorAsHSV()[2]);
                return;
            }
            if (mag >= 1) {
                mag = 1;
            } else {
                mag = Math.sqrt(mag);
            }
            let h = Math.atan2(dy, dx) / (Math.PI * 2);
            if (h < 0) h += 1;
            setCurrentColorAsHSV(h, mag, getCurrentColorAsHSV()[2]);
        }
    }

    canvas.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (capturedPointer === NO_POINTER) {
            canvas.setPointerCapture(capturedPointer = e.pointerId);
            const rect = canvas.getBoundingClientRect();
            usingSlider = (e.clientY - rect.top) > rect.width;
            updateCanvasPointer(e.clientX, e.clientY);
            drawCanvas();
        }
    });
    canvas.addEventListener("pointerup", (e) => {
        if (e.pointerId === capturedPointer) {
            capturedPointer = NO_POINTER;
            canvas.releasePointerCapture(e.pointerId);
        }
    });
    canvas.addEventListener("pointermove", (e) => {
        if (capturedPointer === NO_POINTER || capturedPointer !== e.pointerId) return;
        updateCanvasPointer(e.clientX, e.clientY);
        drawCanvas();
    });

    const presetButtons = presets.querySelectorAll("button");
    let presetButton;
    for (let i=0; i < presetButtons.length; i++) {
        presetButton = presetButtons.item(i);
        const presetName = presetButton.getAttribute("data-color-name");
        if (!presetName) return;
        const presetHex = presetButton.getAttribute("data-color-hex");
        if (!presetHex) return;

        function octetAt(index) {
            return (hexCharCode2Nibble(presetHex.charCodeAt(index)) << 4)
                | hexCharCode2Nibble(presetHex.charCodeAt(index | 1));
        }

        const red = octetAt(0);
        const green = octetAt(2);
        const blue = octetAt(4);

        presetButton.title = presetName;
        presetButton.addEventListener("pointerdown", () => {
            code.value = presetHex;
            code.classList.remove("invalid");
            code.setAttribute("data-color-name", presetName);
            setCurrentColorAsRGB(red, green, blue);
            drawCanvas();
        });
    }

    code.addEventListener("input", () => {
        const value = code.value;
        let valid = value.length === 6;
        let r, g, b;
        if (valid) {
            try {
                r = (hexCharCode2Nibble(value.charCodeAt(0)) << 4) | hexCharCode2Nibble(value.charCodeAt(1));
                g = (hexCharCode2Nibble(value.charCodeAt(2)) << 4) | hexCharCode2Nibble(value.charCodeAt(3));
                b = (hexCharCode2Nibble(value.charCodeAt(4)) << 4) | hexCharCode2Nibble(value.charCodeAt(5));
            } catch (e) {
                valid = false;
            }
        }
        code.classList[valid ? "remove" : "add"]("invalid");
        if (!valid) return;
        code.removeAttribute("data-color-name");
        setCurrentColorAsRGB(r, g, b);
        drawCanvas();
    });
});
