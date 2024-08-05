// Used by the web demo to handle input widgets (bold, italic, underline, strikethrough, obfuscated, colors)

((window) => {
    const document = window.document;

    const TAG_MAP = {
        "bold": "b",
        "italic": "i",
        "underlined": "u",
        "strikethrough": "st",
        "obfuscated": "obf"
    };

    /**
     * @param input {HTMLTextAreaElement}
     * @param name {string}
     */
    function applyTag(input, name) {
        const { selectionStart, selectionEnd } = input;
        let { value } = input;
        let newValue, newStart, newEnd;
        if (selectionStart === selectionEnd) {
            newValue = value + `<${name}>`;
            newStart = newEnd = newValue.length;
            newValue += `</${name}>`;
        } else {
            const pre = value.substring(0, selectionStart);
            const per = value.substring(selectionStart, selectionEnd);
            const post = value.substring(selectionEnd, value.length);
            newValue = pre + `<${name}>`;
            newStart = newValue.length;
            newValue += per;
            newEnd = newValue.length;
            newValue += `</${name}>` + post;
        }
        input.value = newValue;
        input.focus();
        input.setSelectionRange(newStart, newEnd);
        // fire an artifical input event to make io.js respond
        input.dispatchEvent(new InputEvent("input"));
    }

    /**
     * @param input {HTMLTextAreaElement}
     * @param element {HTMLAnchorElement}
     * @param action {"bold" | "italic" | "underlined" | "strikethrough" | "obfuscated" | "colors"}
     */
    function registerWidget(input, element, action) {
        let tagName = TAG_MAP[action];
        if (!!tagName) {
            element.addEventListener("click", () => {
                applyTag(input, tagName);
            });
            return;
        }
        if (action === "colors") {
            const modal = document.querySelector("#colors-modal");
            if (!modal) return;
            element.addEventListener("click", () => {
                if (modal.classList.contains("show")) return;
                const rect = element.getBoundingClientRect();
                modal.style.left = `${(rect.left + (rect.width / 2)) * (100 / window.innerWidth)}vw`;
                modal.style.top = `${(rect.bottom * (100 / window.innerHeight))}vh`;
                modal.classList.add("show");
            });
            const code = modal.querySelector("[data-role='code']");
            if (!code) return;
            const btn = modal.querySelector("[data-role='submit']");
            if (!btn) return;
            btn.addEventListener("click", () => {
                if (code.classList.contains("invalid")) return;
                let name = code.hasAttribute("data-color-name") ?
                    code.getAttribute("data-color-name") :
                    ("#" + code.value);
                applyTag(input, name);
            });
            return;
        }
        throw new Error("Unimplemented widget action: " + action);
    }

    window.addEventListener("DOMContentLoaded", () => {
        const root = document.querySelector("#input-widgets");
        if (!root) return;
        const input = document.querySelector("#input");
        if (!input) return;

        const widgets = root.querySelectorAll("a");
        let widget, action;
        for (let i=0; i < widgets.length; i++) {
            widget = widgets.item(i);
            action = widget.getAttribute("data-widget-action");
            if (!action) continue;
            registerWidget(input, widget, action);
        }
    });
})(window);