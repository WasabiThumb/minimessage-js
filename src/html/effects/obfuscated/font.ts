
export namespace ObfuscatedFont {

    export const FAMILY = "Obfuscated";

    export const inject = ((base64: string) => {
        const binary = atob(base64);
        const buf = new ArrayBuffer(binary.length);
        const u8 = new Uint8Array(buf);
        for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);

        let loadPromise: Promise<void> | null = null;
        return (() => {
            let ret: Promise<void> | null = loadPromise;
            if (ret !== null) return ret;

            const face = new FontFace(ObfuscatedFont.FAMILY, buf, { descentOverride: `30%`, ascentOverride: `104%` });
            loadPromise = ret = face.load().then<void>((f) => {
                document.fonts.add(f);
            });
            return ret;
        });
    })(
        "d09GMgABAAAAAAP0AA0AAAAAEdAAAAOeAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cGiAGYACCUhEICpY4jkkLcgABNgIkA3gEIAW" +
        "DRQeBEhuHDBHVm3EhvjiwXdCgrSoiydUL8rhi5+BJySydJUvO46FvP353dvaL4RZ/wzWpJc9UfxuB5JmQiSaVRKgcQoS68Dw/9ztX3tv27+" +
        "Qj1r1pJEQqGyJSqYnOD4UEKTA4b0gFuka19xDR17yla8MTHPgBx1fl1VxOXW5eqAJJ2hIa00qXZEN7d5lXZXYA6OrYGWShCIUnWVmngaypU" +
        "LaLdTXwK3BXOCyJAH/vz1fYgDdXDx/x2goCpmGeZQpUdG7025dEnhvhBQX6NQs2+wUVZAxrHjt3/qwD1rlfcfUNGzvJlg3rBOT4drJKAMcl" +
        "gVWqTYwrKaxz1f3esc5B13vvf/rP/lkAIEYhAKKAAgAQSEN1HcnF3aR1h2n96UQP+E+wZi2hjAup9HU/72es8yGmXGoDECd6V9znDnAXbyn" +
        "fyJMA48AIQDLKKSeUMvX0xE3CiMj9aIdRQr5nX5VSOE++42zDxDwaZm85DoRPlK/Dx/2t2Yf7e2PMftrPamo8JFLkCwmuo0ER1klon6IfCR" +
        "9sZOrKzunBwb12VPrGyFjkDiOlwQ1C78PmQ9bSWOQh1dJR1+eAsgw9HpANlaBnKXUTwe1Y5EE30aPIirzT6BYmSEIz9J4dDFA3Mqul0/Dye" +
        "iS8OXTEOjI0slY6f17MMu7z2HXIUQoNvzmRumOYScc1Cy14Bd6jSeEN1k24L2my8tqMZwMF4RKk9e5zKur7X4mztv3vRr8Pv9/AhJbO/v/z" +
        "opucPK3n/iykQZ4+9M4whmqapmNdNXTRGAZtwklw9A4hOBJCDKZog6mUPTcKknu/yRwKNXlbdQ0pPIPbXVFlR06hIOYQjsEs1bS22kWRGkM" +
        "/hTm4vdeTmnyW3j7JavpN0lqkGKz1djNMdkDgYHymPvxSXTY2yCBP/vPJ67V1e/9IOM+kFOlyYQXjyxOoQL5ymEUAWY1/CnEBCV4kYIdlRo" +
        "ECkszxJbhFhDCyBEVhF9KqZ1CN/MCI8L/zqFHUGKkVQAdiVoJqLYPZtwfcrHeQzPt9Edms/zic0hj8Xq3ap9eBUzeG//1HmH12Oqs3+m1qD" +
        "/jtnV0BjjkdPvY1PkY9FFkeMZHcprFr5BmBEeqjCvwYgkoe8Iw9RuvJJG3Q5ProTTAvWkfaYHax4fGaG1iAQqNc8L7iQoP1eZ61AOAOCo5/" +
        "ByAgmCAp2uX2eH0My/GCKMmKqgXd7DAt2/FjOEEiU6g0OoPJYnO4PL5AKBJLpDI5AA=="
    );

}
