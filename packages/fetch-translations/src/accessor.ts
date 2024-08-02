import {Locale} from "./locales";
import {TranslationMap} from "./spec";
import syncRequest, {Options} from "sync-request";

const USER_AGENT: string = `minimessage-js; wasabithumbs@gmail.com`;
const STANDARD_HEADERS = {
    "User-Agent": USER_AGENT
};

// GitHub API parameters
const GH_URL: string = `https://api.github.com/repos/WasabiThumb/minimessage-js/contents/packages/translations/data/all/`;
const GH_HEADERS = {
    ...STANDARD_HEADERS,
    "Accept": `application/vnd.github.raw+json`,
    "X-GitHub-Api-Version": `2022-11-28`
};

// CDN stubs to try to fetch lang files from, in order of quality
const FETCH_URLS: string[] = [
    `https://unpkg.com/@minimessage-js/translations/data/all/`,
    `https://cdn.jsdelivr.net/gh/WasabiThumb/minimessage-js/packages/translations/data/all/`,
    `https://raw.githubusercontent.com/WasabiThumb/minimessage-js/master/packages/translations/data/all/`
];

function setHeadersForXHR(xhr: XMLHttpRequest, headers: object): void {
    const qual = headers as unknown as { [k: string]: string };
    for (const k of Object.keys(qual)) {
        xhr.setRequestHeader(k, qual[k]);
    }
}

function getJSONAsync(url: string, gh: boolean = false): Promise<TranslationMap> {
    return fetch(url, {
        method: "GET",
        headers: gh ? GH_HEADERS : STANDARD_HEADERS
    }).then((r) => r.json() as unknown as TranslationMap);
}

function getJSONSync(url: string, gh: boolean = false): TranslationMap {
    if (typeof process === "object") {
        // NodeJS
        const response = syncRequest("GET", url, {
            headers: gh ? GH_HEADERS : STANDARD_HEADERS
        } as unknown as Options);
        return JSON.parse((response.getBody() as Buffer).toString("utf-8")) as unknown as TranslationMap;
    } else {
        // Browser
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        setHeadersForXHR(xhr, gh ? GH_HEADERS : STANDARD_HEADERS);
        xhr.send(null);

        if (xhr.status < 200 || xhr.status > 299)
            throw new Error(`HTTP ${xhr.status} : ${xhr.statusText}`);

        if (xhr.responseType === "json")
            return xhr.response as unknown as TranslationMap;

        if (xhr.responseType === "text")
            return JSON.parse(xhr.response as string) as unknown as TranslationMap;

        if (xhr.responseType === "arraybuffer")
            return JSON.parse(
                (new TextDecoder()).decode(xhr.response as ArrayBuffer)
            ) as unknown as TranslationMap;

        return JSON.parse(xhr.responseText) as unknown as TranslationMap;
    }
}

type InitialState = { code: 0 };
type PromiseState = { code: 1, value: Promise<TranslationMap> };
type ResolvedState = { code: 2, value: TranslationMap };
type State = InitialState | PromiseState | ResolvedState;

export class TranslationAccessor {

    readonly locale: Locale;
    private state: State = { code: 0 };
    constructor(key: Locale) {
        this.locale = key;
    }

    get ghURL(): string {
        return `${GH_URL}${this.locale}.json`;
    }

    get cdnURLs(): string[] {
        const ret: string[] = new Array(FETCH_URLS.length);
        for (let i=0; i < FETCH_URLS.length; i++) {
            ret[i] = `${FETCH_URLS[i]}${this.locale}.json`;
        }
        return ret;
    }

    get(): TranslationMap {
        if (this.state.code === 2) return this.state.value;

        let url: string = this.ghURL;
        let map: TranslationMap | null = null;
        try {
            map = getJSONSync(url, true);
            this.state = { code: 2, value: map };
            return map;
        } catch (e) {
            console.warn(e);
        }

        const urls = this.cdnURLs;
        for (let i=0; i < urls.length; i++) {
            url = urls[i];
            if (i !== (urls.length - 1)) {
                try {
                    map = getJSONSync(url);
                } catch (e) {
                    console.warn(e);
                    continue;
                }
            } else {
                map = getJSONSync(url);
            }
            break;
        }

        this.state = { code: 2, value: map! };
        return map!;
    }

    getAsync(): Promise<TranslationMap> {
        switch (this.state.code) {
            case 0:
                let promise: Promise<TranslationMap> = getJSONAsync(this.ghURL, true);

                for (let url of this.cdnURLs) {
                    const finalURL: string = url;
                    promise = promise.catch<TranslationMap>((e) => {
                        console.warn(e);
                        return getJSONAsync(finalURL);
                    });
                }

                this.state = { code: 1, value: promise };

                promise.then((value: TranslationMap) => {
                    this.state = { code: 2, value };
                });

                return promise;
            case 1:
                return this.state.value;
            case 2:
                return Promise.resolve(this.state.value);
        }
    }

}
