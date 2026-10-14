import * as adventure from "./index";

// UMD entry point, which assigns the
// exports to window.adventure

declare global {
    interface Window {
        /**
         * UMD export for MiniMessage, only valid when using the UMD build (`minimessage.umd.js`).
         *
         * @example
         *     const { MiniMessage } = window.adventure;
         */
        readonly adventure: typeof adventure;
    }
}

((g: any) => {
    Object.defineProperty(g, "adventure", {
        value: Object.freeze(adventure),
        writable: false,
        enumerable: true,
        configurable: false,
    });
})(typeof globalThis === "object" ? globalThis : window);

//@ts-ignore
if (typeof module === "object") module.exports = adventure;
