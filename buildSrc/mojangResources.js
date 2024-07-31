const stream = require("node:stream");
const { pipeline } = require("node:stream/promises");
const fs = require("node:fs/promises");
const path = require("node:path");
const unzip = require("unzip-stream");

const USER_AGENT = "minimessage-js; wasabithumbs@gmail.com";
const STANDARD_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json;charset=UTF-8;q=1, */*;q=0.9"
};
const ENDPOINT = `https://piston-meta.mojang.com/mc/game/version_manifest_v2.json`;

/**
 * Helper function, in absence of TypeScript, to read typed fields from the result of a JSON endpoint.
 *
 * @param object {any} Object to get value of
 * @param key {string} Key to index into object with
 * @param type {"array" | "object" | "string"} Type that ``object[key]`` should have
 * @return {any}
 */
function typedGet(object, key, type) {
    if (!(key in object)) throw new Error(`Bad data from API: \"${key}\" not present`);
    const value = object[key];
    let match = (type === "array") ? Array.isArray(value) : (typeof value === type);
    if (!match) throw new Error(`Bad data from API: \"${key}\" is not of type ${type}`);
    return value;
}

/**
 * Gets the manifest for the latest client release from Mojang API
 *
 * @return {Promise<any>}
 */
async function getLatestReleaseManifest() {
    const all = await (fetch(ENDPOINT, {
        method: "GET",
        headers: STANDARD_HEADERS
    }).then((r) => r.json()));

    const latest = typedGet(all, "latest", "object");
    const versions = typedGet(all, "versions", "array");

    const release = typedGet(latest, "release", "string");
    let version = null;
    for (let candidate of versions) {
        const id = typedGet(candidate, "id", "string");
        if (id === release) {
            version = candidate;
            break;
        }
    }
    if (version === null) throw new Error(`Bad data from API: Release ${release} has no match in versions array`);

    const url = typedGet(version, "url", "string");
    const pattern = /^https?:\/\/.*\.mojang.com\/.*\.json$/i;
    if (!pattern.test(url)) throw new Error(`Bad data from API: URL ${url} does not match trusted pattern`);

    return fetch(url, {
        method: "GET",
        headers: STANDARD_HEADERS
    }).then((r) => r.json());
}

/**
 * Uses the latest client manifest to open a readable stream containing the client JAR
 * @return {Promise<stream.Readable>}
 */
async function openLatestClientJAR() {
    const manifest = await getLatestReleaseManifest();
    const url = typedGet(typedGet(typedGet(manifest,
                "downloads", "object"),
            "client", "object"),
        "url", "string");

    return fetch(url, {
        method: "GET",
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/java-archive;q=1, application/x-java-archive;q=0.9, application/octet-stream;q=0.8, */*;q=0.7"
        }
    }).then((r) => {
        const { body } = r;
        if (body === null) throw new Error(`Bad data from API: Null body`);
        return stream.Readable.fromWeb(body);
    });
}

/**
 * Uses the client JAR stream to populate a map, where the keys are assets within the JAR that we want, and the values
 * are initialized to null where this method will populate them with the asset data.
 * @param assets { { [key: string]: Buffer | null } }
 * @return {Promise<void>}
 */
async function getAssetsFromLatestClientJAR(assets) {
    await pipeline(
        await openLatestClientJAR(),
        unzip.Parse(),
        stream.Transform({
            objectMode: true,
            transform: function (entry, e, cb) {
                if (entry.type === "File" && (entry.path in assets)) {
                    const chunks = [];
                    entry.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    entry.on("end", () => {
                        assets[entry.path] = Buffer.concat(chunks);
                        cb();
                    });
                } else {
                    entry.autodrain();
                    cb();
                }
            }
        })
    );
}

/**
 * Similar to indexOf, but ``needle`` is guaranteed to be 1 character long.
 * @param haystack {string}
 * @param needle {string}
 * @return {number}
 */
function indexOfChar(haystack, needle) {
    const code = needle.codePointAt(0);
    for (let i=0; i < haystack.length; i++) {
        if (code === haystack.codePointAt(i)) return i;
    }
    return -1;
}

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
 * Writes key-values to a TS source file
 * @param out { string }
 * @param properties { { [key: string]: any } }
 * @param comments { { [key: string]: string | undefined } | undefined }
 * @return {Promise<void>}
 */
async function writePropertiesFile(out, properties, comments) {
    const hasComments = (typeof comments === "object");
    const fh = await fs.open(out, "w");
    try {
        const HEADER = "/*\n * THIS FILE IS AUTOMATICALLY GENERATED\n * DO NOT EDIT MANUALLY\n * SEE buildSrc/mojangResources.js\n*/\n";
        await fh.writeFile(HEADER, "utf-8");

        let value, valueType, comment;
        for (const key of Object.keys(properties)) {
            value = properties[key];
            valueType = typeof value;

            comment = hasComments && comments[key];
            await fh.writeFile((!!comment) ? `\n/** ${comment} */\n` : `\n\n`, "utf-8");

            await fh.writeFile(`export const ${key}: ${valueType} = `, "utf-8");

            switch (valueType) {
                case "number":
                    await fh.writeFile(value.toString(), "utf-8");
                    break;
                case "string":
                    await fh.writeFile("\"" + value.replace(/"/g, "\\\"") + "\"", "utf-8");
                    break;
                default:
                    throw new Error("No serializer implemented for property type: " + valueType);
            }

            await fh.writeFile(`;\n`, "utf-8");
        }
    } finally {
        await fh.close();
    }
}

/**
 * Write the data for the obfuscated (magic enchant table) font to "src/font/obf/data.ts"
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

async function main() {
    const root = path.resolve(__dirname, "..");
    await updateObfuscatedFont(root);
}

if (require.main === module) {
    main().catch(console.error);
}