
export namespace HexUtil {

    // Converts a nibble (0x0 - 0xF) into a hex char code (48 - 57, 65 - 70)
    export function nibble2HexCharCode(nibble: number): number {
        if (nibble < 10) return 48 + nibble;
        return 55 + nibble;
    }

    // Converts an octet (0x00 - 0xFF) into a hex string ("00" - "FF")
    export function octet2Hex(octet: number): string {
        return String.fromCharCode(
            nibble2HexCharCode(octet >> 4),
            nibble2HexCharCode(octet & 0xF)
        );
    }

    // Converts a hex char code (48 - 57, 65 - 70, 97 - 102) into a nibble (0x0 - 0xF)
    export function hexCharCode2Nibble(char: number): number {
        if (char < 58) return (char - 48);
        if (char < 71) return (char - 55);
        return (char - 87);
    }

    // Converts a hex string ("00" - "FF") to an octet (0x00 - 0xFF)
    export function hex2Octet(hex: string, offset: number = 0): number {
        return (hexCharCode2Nibble(hex.charCodeAt(offset)) << 4) | hexCharCode2Nibble(hex.charCodeAt(offset + 1));
    }

}
