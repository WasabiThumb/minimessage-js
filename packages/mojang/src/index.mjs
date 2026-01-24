import { iter } from "but-unzip";
import { parseJsonStreamWithPaths, streamToIterable } from "json-stream-es";

//

const USER_AGENT = `minimessage-js; xpedraza542@gmail.com`;
const ACCEPT_JSON = `"application/json;charset=UTF-8;q=1, */*;q=0.8"`;
const ACCEPT_TEXT = `text/plain;charset=UTF-8;q=1, */*;q=0.8`;

function makeHeaders(accept) {
    const ret = { "User-Agent": USER_AGENT };
    if (!!accept) ret["Accept"] = accept;
    return ret;
}

/**
 * @typeParam T
 * @param fn { ((...args: any[]) => T | Promise<T>) }
 * @return { ((k0?: any) => Promise<T>) }
 */
function runOnce(fn) {
    let init = false;
    let multi = false;
    let cache;

    return (async (k0) => {
        try {
            if (typeof k0 === "undefined") {
                if (init) return cache;
                init = true;
                return cache = fn(k0);
            } else {
                const k = String(k0);
                if (init) {
                    if (multi) {
                        if (k in cache) return cache[k];
                    } else {
                        cache = {"undefined": cache};
                        multi = true;
                    }
                } else {
                    cache = {};
                    init = multi = true;
                }
                return cache[k] = fn(k0);
            }
        } catch (e) {
            init = multi = false;
            throw e;
        }
    });
}

//

function Asset(path, hash, size) {
    function getUrl() {
        const discriminator = hash.substring(0, 2);
        return `https://resources.download.minecraft.net/${discriminator}/${hash}`;
    }

    function download() {
        return fetch(getUrl(), { headers: makeHeaders(), cache: "force-cache" })
            .then((r) => r.body);
    }

    /** @type {() => Promise<string>} */
    const downloadAsString = runOnce(() => {
        return fetch(getUrl(), { headers: makeHeaders(ACCEPT_TEXT), cache: "force-cache" })
            .then((r) => r.text());
    });

    /** @type {() => Promise<any>} */
    const downloadAsJson = runOnce(() => {
        return fetch(getUrl(), { headers: makeHeaders(ACCEPT_JSON), cache: "force-cache" })
            .then((r) => r.json());
    });

    /** @type import("../types/struct").Asset */
    const ret = {
        path,
        hash,
        size,
        download,
        downloadAsString,
        downloadAsJson
    };
    return Object.freeze(ret);
}

function Version(id, packageUrl) {
    /**
     * @typedef { { assetIndex: { url: string }, downloads: { client: { url: string } } } } PackageInfo
     */

    /** @type { () => Promise<PackageInfo> } */
    const getPackageInfo = runOnce(() => {
        return fetch(packageUrl, { headers: makeHeaders(ACCEPT_JSON), cache: "force-cache" })
            .then((r) => r.json());
    });

    /** @type { () => Promise<Uint8Array> } */
    const getClientJarData = runOnce(async () => {
        const info = await getPackageInfo();
        return fetch(info.downloads.client.url, { headers: makeHeaders(), cache: "force-cache" })
            .then((r) => r.arrayBuffer())
            .then((ab) => new Uint8Array(ab));
    });

    /** @type { (path: string) => Promise<Uint8Array | null> } */
    const getResource = (async (path) => {
        const jarData = await getClientJarData();
        for (const entry of iter(jarData)) {
            if (entry.filename === path) {
                return entry.read();
            }
        }
        return null;
    });

    /** @type { () => Promise<string> } */
    const getAssetIndexUrl = (async () => {
        return (await getPackageInfo()).assetIndex.url;
    });

    /** @returns {import("../types/struct").Assets} */
    async function getAssets() {
        /** @type {(path: string) => boolean} */
        let test;
        let satisfied = false;

        if (arguments.length === 0) {
            test = (() => true);
        } else if (arguments.length === 1 && typeof arguments[0] === "function") {
            test = arguments[0];
        } else {
            const set = new Set();
            for (const arg of arguments) set.add(String(arg));

            let count = 0;
            test = ((s) => {
                if (set.has(s)) {
                    if ((++count) >= set.size) satisfied = true;
                    return true;
                }
                return false;
            });
        }

        const res = await fetch(
            await getAssetIndexUrl(),
            { headers: makeHeaders(ACCEPT_JSON), cache: "force-cache" }
        );
        const stream = res.body
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(parseJsonStreamWithPaths([ "objects" ]));

        let ret = {};
        for await (const entry of streamToIterable(stream)) {
            const { path, value } = entry;
            if (path.length !== 2) continue;
            const part = String(path[1]);
            if (!test(part)) continue;
            ret[part] = Asset(part, String(value.hash), Number(value.size));
            if (satisfied) break;
        }
        return Object.freeze(ret);
    }

    /** @type import("../types/struct").Version */
    const ret = {
        id,
        getResource,
        getAssets
    };
    return Object.freeze(ret);
}

function MojangAPIImpl() {
    /**
     * @typedef {{ id: string, url: string }} VersionManifestEntry
     * @typedef {{ latest: { release: string, snapshot: string }, versions: VersionManifestEntry[] }} VersionManifest
     */

    /** @type {() => Promise<VersionManifest>} */
    const getVersionManifest = runOnce(() => {
        return fetch(
            `https://piston-meta.mojang.com/mc/game/version_manifest_v2.json`,
            { headers: makeHeaders(ACCEPT_JSON) }
        ).then((r) => r.json());
    });

    /** @type {(id: string) => Promise<import("../types/struct").Version | null>} */
    const getRelease = runOnce(async (id) => {
        const manifest = await getVersionManifest();
        let version = manifest.versions.find((v) => v.id === id);
        if (!version) return null;
        return Version(version.id, version.url);
    });

    /** @type {(id: string) => Promise<import("../types/struct").Version>} */
    const getLatestRelease = (async () => {
        const manifest = await getVersionManifest();
        return getRelease(manifest.latest.release);
    });

    /** @type {(id: string) => Promise<import("../types/struct").Version>} */
    const getLatestSnapshot = (async () => {
        const manifest = await getVersionManifest();
        return getRelease(manifest.latest.snapshot);
    });

    /** @type import("../types/struct").MojangAPI */
    const ret = {
        getRelease,
        getLatestRelease,
        getLatestSnapshot
    };
    return Object.freeze(ret);
}

//

const MojangAPI = MojangAPIImpl();
export default MojangAPI;
