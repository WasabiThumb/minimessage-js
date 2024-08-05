// Used by the web demo to make resize handles work

((window) => {
    const document = window.document;

    /**
     * @param handle {HTMLElement}
     */
    function registerHandle(handle) {
        const horizontal = handle.classList.contains("horizontal");
        const a = handle.previousElementSibling;
        const b = handle.nextElementSibling;
        const parent = handle.parentElement;
        if (a === null || b === null || parent === null) return;
        if (!(a instanceof HTMLElement) || !(b instanceof HTMLElement)) return;

        /** @type {"width" | "height"} */
        const axis = horizontal ? "height" : "width";

        /**
         * @param e {Element}
         * @return {number}
         */
        function dimensionOf(e) {
            return (e.getBoundingClientRect())[axis];
        }

        let capturedPointer = -1;

        handle.addEventListener("pointerdown", (e) => {
            if (capturedPointer === -1) {
                handle.setPointerCapture(capturedPointer = e.pointerId);
            }
        });
        handle.addEventListener("pointerup", (e) => {
            if (e.pointerId === capturedPointer) {
                handle.releasePointerCapture(e.pointerId);
                capturedPointer = -1;
            }
        });
        handle.addEventListener("pointermove", (e) => {
            if (e.pointerId !== capturedPointer) return;
            const movement = horizontal ? e.movementY : e.movementX;

            const ad = dimensionOf(a);
            const bd = dimensionOf(b);
            const pd = dimensionOf(parent);

            let aDestFrac = Math.min(Math.max((ad + movement) / pd, 0.05), 0.95) * 100;
            let bDestFrac = Math.min(Math.max((bd - movement) / pd, 0.05), 0.95) * 100;

            a.style[axis] = `${aDestFrac}%`;
            b.style[axis] = `${bDestFrac}%`;
        });
    }

    window.addEventListener("DOMContentLoaded", () => {
        const handles = document.querySelectorAll(".resize-handle");
        for (let i=0; i < handles.length; i++)
            registerHandle(handles.item(i));
    });
})(window);
