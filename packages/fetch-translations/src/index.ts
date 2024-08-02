import {ITranslations, TranslationMap} from "./spec";
import {Locale, Locales} from "./locales";
import {TranslationAccessor} from "./accessor";
const LOCALE_MAX_LENGTH = Locales.reduce((a, b) => Math.max(a, b.length), 0);

function tryNormalize(key: string): Locale | null {
    if (key.length > LOCALE_MAX_LENGTH) return null;
    let asserted = key as unknown as Locale;

    if (Locales.indexOf(asserted) !== -1) return asserted;

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
    asserted = key as unknown as Locale;
    if (Locales.indexOf(asserted) === -1) return null;
    return asserted;
}

function normalize(key: string): Locale {
    const out = tryNormalize(key);
    if (out === null) throw new Error(`Invalid lang ID: ${key}`);
    return out;
}

const ACCESSORS: { [key: string]: TranslationAccessor } = {};

function getAccessor(key: Locale): TranslationAccessor {
    let accessor: TranslationAccessor;
    if (key in ACCESSORS) {
        accessor = ACCESSORS[key];
    } else {
        accessor = (ACCESSORS[key] = new TranslationAccessor(key));
    }
    return accessor;
}

const Translations: ITranslations = {
    list(): Locale[] {
        return [...Locales];
    },
    has(key: Locale | string): boolean {
        return tryNormalize(key) !== null;
    },
    get(key: Locale | string): TranslationMap {
        return getAccessor(normalize(key)).get();
    },
    getAsync(key: Locale | string): Promise<TranslationMap> {
        return getAccessor(normalize(key)).getAsync();
    }
};

export = Translations;
