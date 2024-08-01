/**
 * @type {string[]}
 */
const LIST = require("../data/list.json");
const MAX_LENGTH = LIST.reduce((a, b) => Math.max(a, b.length), 0);

/** Utility class to access lang files */
class Accessor {

    /**
     * @param key {import('../types/locales').Locale}
     */
    constructor(key) {
        this.key = key;
        this.path = `../data/all/${key}.json`;
        this.state = 0;
        this.value = null;
    }

    /**
     * @return {Promise<import('../types/index').TranslationMap>}
     */
    get() {
        if (this.state !== 0) return this.value;
        if (typeof process !== "object") return this.getSync(); // Browser

        const fs = require("node:fs/promises");
        const path = require("node:path");
        const abs = path.resolve(__dirname, this.path);

        /** @type { Promise<import('../types/index').TranslationMap> } */
        const promise = fs.readFile(abs, { encoding: "utf-8" })
            .then((str) => JSON.parse(str));

        this.state = 1;
        this.value = promise;

        promise.then((v) => {
            this.state = 2;
            this.value = v;
        });

        return promise;
    }

    /**
     * @return {Promise<import('../types/index').TranslationMap>}
     */
    getSync() {
        if (this.state === 2) {
            return this.value;
        }
        const data = require(this.path);
        this.value = data;
        this.state = 2;
        return data;
    }

}

/** @type { { [key: string]: Accessor | undefined } } */
const ACCESSORS = {};

function getAccessor(key) {
    if (key in ACCESSORS) return ACCESSORS[key];
    const accessor = new Accessor(key);
    ACCESSORS[key] = accessor;
    return accessor;
}

/**
 * Tries to normalize a lang key
 * @param key {string}
 * @return {import('../types/locales').Locale | null}
 */
function tryNormalize(key) {
    if (key.length > MAX_LENGTH) return null;
    if (LIST.indexOf(key) !== -1) {
        // noinspection JSValidateTypes
        return key;
    }

    let chars = new Array(key.length);
    let any = false;
    for (let i=0; i < key.length; i++) {
        let char = key.charCodeAt(i);
        if (char === 45) { // convert dashes to underscores
            any = true;
            char = 95;
        } else if (65 <= char && char <= 90) { // convert uppercase latin to lowercase
            any = true;
            char += 32;
        }
        chars[i] = char;
    }
    if (!any) return null;

    key = String.fromCharCode.apply(null, chars);
    if (LIST.indexOf(key) === -1) return null;
    // noinspection JSValidateTypes
    return key;
}

/**
 * @param key {string}
 * @return {import('../types/locales').Locale}
 */
function normalize(key) {
    const out = tryNormalize(key);
    if (out === null) throw new Error(`Invalid lang ID: ${key}`);
    return out;
}

/**
 * @type {import('../types/index').ITranslations}
 */
const Translations = {
    /**
     * @return {(import('../types/locales').Locale)[]}
     */
    list() {
        // noinspection JSValidateTypes
        return LIST;
    },
    has(key) {
        return tryNormalize(key) !== null;
    },
    getAsync(key) {
        return getAccessor(normalize(key)).get();
    },
    get(key) {
        return getAccessor(normalize(key)).getSync();
    }
};

module.exports = Translations;
