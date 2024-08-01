/*
 * Fetch data from Mojang resource APIs as documented here:
 * https://wiki.vg/Game_files
 */

const { typedGet, memoize, fetchStream } = require("./util");
const stream = require("node:stream");
const streamJson = require("stream-json");
const { pipeline } = require("node:stream/promises");
const unzip = require("unzip-stream");

const USER_AGENT = "minimessage-js; wasabithumbs@gmail.com";
const STANDARD_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json;charset=UTF-8;q=1, */*;q=0.9"
};
const ENDPOINT = `https://piston-meta.mojang.com/mc/game/version_manifest_v2.json`;
const DOWNLOAD_URI = `https://resources.download.minecraft.net/`;

/**
 * Gets the manifest for the latest client release from Mojang API
 * @type { () => Promise<any> }
 */
const getLatestReleaseManifest = memoize(async () => {
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
});

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

    return fetchStream(url, {
        "User-Agent": USER_AGENT,
        "Accept": "application/java-archive;q=1, application/x-java-archive;q=0.9, application/octet-stream;q=0.8, */*;q=0.7"
    });
}

/**
 * Uses the client JAR stream to populate a map, where the keys are assets within the JAR that we want, and the values
 * are initialized to null where this method will populate them with the asset data.
 * @param assets { { [key: string]: Buffer | null } }
 * @return {Promise<void>}
 */
async function getAssetsFromLatestClientJAR(assets) {
    const assetKeys = Object.keys(assets);
    function isSatisfied() {
        for (let k of assetKeys) {
            if (typeof assets[k] === "undefined" || assets[k] === null) return false;
        }
        return true;
    }

    let endEarlyFn = (() => {});
    const endEarlyPromise = new Promise((res) => {
        endEarlyFn = res;
    });

    const inStream = await openLatestClientJAR();

    // Mean tower of power incoming!
    return Promise.race([
        endEarlyPromise,
        pipeline(
            inStream,
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
                            if (isSatisfied()) {
                                endEarlyFn();
                                inStream.destroy();
                            } else {
                                cb();
                            }
                        });
                    } else {
                        entry.autodrain();
                        cb();
                    }
                }
            })
        )
    ]);
}

/**
 * Traverses the asset index for the latest version, finding assets that match the pattern and providing a Blob getter
 * for each.
 * @param pattern { RegExp }
 * @return {Promise<{ match: RegExpExecArray, size: number, hash: string, get(): Promise<Buffer> }[]>}
 */
async function getAssetsFromLatestIndex(pattern) {
    const manifest = await getLatestReleaseManifest();
    let ret = [];

    /**
     * Adds to "ret" a correctly formatted entry given a key, size & hash
     */
    function addEntry(key, size, hash) {
        const match = pattern.exec(key);
        if (!match) return;
        const discriminator = hash.substring(0, 2);
        const downloadURL = `${DOWNLOAD_URI}/${discriminator}/${hash}`;

        ret.push({
            match, size, hash,
            get() {
                return fetch(downloadURL, {
                    method: "GET",
                    headers: {
                        "User-Agent": USER_AGENT
                    }
                }).then((r) => r.arrayBuffer())
                    .then((ab) => Buffer.from(ab));
            }
        });
    }

    const indexObj = typedGet(manifest, "assetIndex", "object");
    const indexUrl = typedGet(indexObj, "url", "string");
    const indexStream = await fetchStream(indexUrl, STANDARD_HEADERS);

    const parser = streamJson.parser();
    /**
     * - ``0``: Awaiting "keyValue" for "objects"
     * - ``1``: "startKey" -> ``2``, "endObject" -> ``4``
     * - ``2``: Receiving "keyValue", storing in "currentKey"
     * - ``3``: Reading "hash" and "size", "endObject" -> ``1``
     * - ``4``: Awaiting "stringValue" for "hash"
     * - ``5``: Awaiting "numberValue" for "size"
     * - ``6``: Done
     * @type {0 | 1 | 2 | 3 | 4 | 5 | 6}
     */
    let parseState = 0;
    let currentKey = "";
    let currentHash = "";
    let currentSize = 0;

    parser.on("data", (data) => {
        switch (parseState) {
            case 0:
                if (data.name === "keyValue" && data.value === "objects") parseState = 1;
                break;
            case 1:
                if (data.name === "startKey") {
                    parseState = 2;
                } else if (data.name === "endObject") {
                    parseState = 6;
                }
                break;
            case 2:
                if (data.name === "keyValue") {
                    currentKey = data.value;
                    parseState = 3;
                }
                break;
            case 3:
                if (data.name === "endObject") {
                    addEntry(currentKey, currentSize, currentHash);
                    parseState = 1;
                } else if (data.name === "keyValue") {
                    if (data.value === "hash") {
                        parseState = 4;
                    } else if (data.value === "size") {
                        parseState = 5;
                    } else {
                        throw new Error("Unexpected key: " + data.value);
                    }
                }
                break;
            case 4:
                if (data.name === "stringValue") {
                    currentHash = data.value;
                    parseState = 3;
                }
                break;
            case 5:
                if (data.name === "numberValue") {
                    currentSize = parseInt(data.value);
                    parseState = 3;
                }
                break;
        }
    });

    await new Promise((res, rej) => {
        parser.on("end", res);
        parser.on("error", rej);
        indexStream.pipe(parser);
    });

    return ret;
}

module.exports = { getAssetsFromLatestClientJAR, getAssetsFromLatestIndex };
