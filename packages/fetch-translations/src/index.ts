import MojangAPI from "@minimessage-js/mojang";
import type {Asset} from "@minimessage-js/mojang/types/struct";

//

type TranslationData = {
    readonly [key: string]: string
};

export interface MinecraftTranslations {

    list(): Promise<string[]>;

    get(locale: string): Promise<TranslationData>;

}

//

const EN_US = "en_us";

function isLangAsset(key: string): boolean {
    return /^minecraft\/lang\/.*\.json$/.test(key);
}

class StringCollector {

    readonly array: string[];

    constructor() {
        this.array = [];
    }

    //

    add(next: string): boolean {
        const len = this.array.length;
        let cmp: number;
        for (let i = 0; i < len; i++) {
            cmp = this._compare(next, this.array[i]);
            if (cmp > 0) continue;
            if (cmp === 0) return false;
            this.array.length = len + 1;
            this.array.copyWithin(i + 1, i, len);
            this.array[i] = next;
            return true;
        }
        this.array.push(next);
        return true;
    }

    private _compare(a: string, b: string): number {
        const al = a.length;
        const bl = b.length;
        let ml: number;
        let q: number;

        if (al < bl) {
            ml = al;
            q = -1;
        } else if (al > bl) {
            ml = bl;
            q = 1;
        } else {
            ml = al;
            q = 0;
        }

        for (let i = 0; i < ml; i++) {
            const diff = a.charCodeAt(i) - b.charCodeAt(i);
            if (diff !== 0) return diff;
        }

        return q;
    }

}

class MinecraftTranslationsImpl implements MinecraftTranslations {

    private readonly _cache: Record<string, Promise<TranslationData>>;
    private _assets: Promise<Record<string, Asset>> | null = null;

    constructor() {
        this._cache = { };
        this._assets = null;
    }

    //

    async list(): Promise<string[]> {
        const collector = new StringCollector();
        collector.add(EN_US);

        const assets = await this._getAssets();
        for (const path in assets) {
            const name = path.substring(15, path.length - 5);
            collector.add(name);
        }

        return collector.array;
    }

    get(locale: string): Promise<TranslationData> {
        if (locale in this._cache) return this._cache[locale];
        const promise = this._getUncached(locale);
        this._cache[locale] = promise;
        return promise;
    }

    private async _getUncached(locale: string): Promise<TranslationData> {
        let json: any;
        if (EN_US === locale) {
            const version = await MojangAPI.getLatestRelease();
            const u8 = await version.getResource("assets/minecraft/lang/en_us.json");
            if (u8 === null) throw new Error(`Missing en_us asset in client JAR (${version.id})`);
            const text = (new TextDecoder()).decode(u8);
            json = JSON.parse(text);
            return Object.freeze(json as TranslationData);
        } else {
            const assets = await this._getAssets();
            const key = `minecraft/lang/${locale}.json`;
            if (!(key in assets)) throw new Error(`Locale '${locale}' not present`);
            const asset = assets[key];
            json = await asset.downloadAsJson();
        }
        return Object.freeze(json as TranslationData);
    }

    private async _getAssets(): Promise<Record<string, Asset>> {
        let promise: Promise<Record<string, Asset>> | null = this._assets;
        if (promise !== null) return promise;
        this._assets = promise = MojangAPI.getLatestRelease()
            .then((r) => r.getAssets(isLangAsset));
        return promise;
    }

}

//

const MinecraftTranslations: MinecraftTranslations = new MinecraftTranslationsImpl();

export default MinecraftTranslations;
