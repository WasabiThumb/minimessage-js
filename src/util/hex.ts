
export namespace HexUtil {

    export function nibble2HexCharCode(nibble: number): number {
        if (nibble < 10) return 48 + nibble;
        return 55 + nibble;
    }

    export function octet2Hex(octet: number): string {
        return String.fromCharCode(
            nibble2HexCharCode(octet >> 4),
            nibble2HexCharCode(octet & 0xF)
        );
    }

    export function hexCharCode2Nibble(char: number): number {
        if (char < 58) return (char - 48);
        if (char < 71) return (char - 55);
        return (char - 87);
    }

    export function hex2Octet(hex: string, offset: number = 0): number {
        return (hexCharCode2Nibble(hex.charCodeAt(offset)) << 4) | hexCharCode2Nibble(hex.charCodeAt(offset + 1));
    }

}
