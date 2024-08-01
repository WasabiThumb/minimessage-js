/*
 * Write the data for the obfuscated (magic enchant table) font to "src/font/obf/data.ts"
 */

const { typedGet, indexOfChar, writePropertiesFile } = require("./lib/util");
const { getAssetsFromLatestClientJAR } = require("./lib/mojangResources");
const path = require("node:path");

/**
 * Uses the char array read from e.g. ``assets/minecraft/font/alt.json`` to pre-compute font metadata
 * @param chars { string[] }
 * @param firstGlyph { string }
 * @param lastGlyph { string }
 * @return { { GLYPH_WIDTH: number, GLYPH_HEIGHT: number, GLYPH_START: number, GLYPH_END: number } }
 */
function createFontMeta(chars, firstGlyph, lastGlyph) {
    let w = 0;
    const h = chars.length;
    let ax = 0, ay = 0;
    let bx = 0, by = 0;
    let flags = 3;

    let line, idx;
    for (let y=0; y < h; y++) {
        line = chars[y];
        w = Math.max(w, line.length);
        if (flags & 2) {
            idx = indexOfChar(line, firstGlyph);
            if (idx !== -1) {
                ax = idx;
                ay = y;
                flags ^= 2;
            }
        }
        if (flags & 1) {
            idx = indexOfChar(line, lastGlyph);
            if (idx !== -1) {
                bx = idx;
                by = y;
                flags ^= 1;
            }
        }
    }

    return {
        GLYPH_WIDTH: w,
        GLYPH_HEIGHT: h,
        GLYPH_START: (w * ay) + ax,
        GLYPH_END: (w * by) + bx
    };
}

/**
 * @return {Promise<void>}
 */
async function updateObfuscatedFont(rootDir) {
    const ALT_JSON = "assets/minecraft/font/alt.json";
    const ALT_PNG_REL = "font/ascii_sga.png";
    const ALT_PNG_NSK = "minecraft:" + ALT_PNG_REL;
    const ALT_PNG = "assets/minecraft/textures/" + ALT_PNG_REL;
    /**
     * @type { { [key: string]: Buffer | null } }
     */
    let requestedAssets = { [ALT_JSON]: null, [ALT_PNG]: null };

    await getAssetsFromLatestClientJAR(requestedAssets);
    for (let k of Object.keys(requestedAssets)) {
        if (requestedAssets[k] === null)
            throw new Error(`Asset \"${k}\" not found in latest client JAR`);
    }

    const json = JSON.parse(requestedAssets[ALT_JSON].toString("utf-8"));
    const providers = typedGet(json, "providers", "array");
    let provider = null;

    for (let candidate of providers) {
        const providerType = typedGet(candidate, "type", "string");
        if (providerType !== "bitmap") continue;
        const providerFile = typedGet(candidate, "file", "string");
        if (providerFile !== ALT_PNG_NSK) continue;
        provider = candidate;
        break;
    }

    if (provider === null) throw new Error(`Font provider \"${ALT_PNG_NSK}\" is missing from ${ALT_JSON}`);

    const chars = typedGet(provider, "chars", "array");
    const meta = createFontMeta(chars, "A", "Z");
    const bitmap = "data:image/png;base64," + requestedAssets[ALT_PNG].toString("base64");

    await writePropertiesFile(
        path.join(rootDir, "src/font/obf/data.ts"),
        {...meta, GLYPH_DATA: bitmap},
        {
            GLYPH_START: "The first index (inclusive) containing a valid glyph",
            GLYPH_END: "The last index (inclusive) containing a valid glyph",
            GLYPH_WIDTH: "The number of glyphs along the width of the bitmap",
            GLYPH_HEIGHT: "The number of glyphs along the height of the bitmap",
            GLYPH_DATA: "A base64 data URL containing the bitmap"
        }
    );
}

if (require.main === module) {
    updateObfuscatedFont(path.resolve(__dirname, "..")).catch(console.error);
}
