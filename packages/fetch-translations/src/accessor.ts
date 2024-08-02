import {Locale} from "./locales";
import {TranslationMap} from "./spec";
import syncRequest, {Options} from "sync-request";

const USER_AGENT: string = `minimessage-js; wasabithumbs@gmail.com`;
const STANDARD_HEADERS = {
    "user-agent": USER_AGENT
};
const FETCH_URL_A: string = `https://unpkg.com/@minimessage-js/translations/data/all/`;
const FETCH_URL_B: string = `https://cdn.jsdelivr.net/gh/WasabiThumb/minimessage-js/packages/translations/data/all/`;

function getJSONAsync(url: string): Promise<TranslationMap> {
    return fetch(url, {
        method: "GET",
        headers: STANDARD_HEADERS
    }).then((r) => r.json() as unknown as TranslationMap);
}

function getJSONSync(url: string): TranslationMap {
    if (typeof process === "object") {
        // NodeJS
        const response = syncRequest("GET", url, {
            headers: STANDARD_HEADERS
        } as unknown as Options);
        return JSON.parse((response.getBody() as Buffer).toString("utf-8")) as unknown as TranslationMap;
    } else {
        // Browser
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.setRequestHeader("User-Agent", USER_AGENT);
        xhr.responseType = "json";
        xhr.send(null);

        if (xhr.status < 200 || xhr.status > 299)
            throw new Error(`HTTP ${xhr.status} : ${xhr.statusText}`);

        if (xhr.responseType === "json")
            return xhr.response as unknown as TranslationMap;

        if (xhr.responseType === "text")
            return JSON.parse(xhr.response as string) as unknown as TranslationMap;

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

    getURL(alternate?: boolean): string {
        return `${(!!alternate) ? FETCH_URL_B : FETCH_URL_A}${this.locale}.json`;
    }

    get(): TranslationMap {
        if (this.state.code === 2) return this.state.value;

        let url: string = this.getURL();
        try {
            const map = getJSONSync(url);
            this.state = { code: 2, value: map };
            return map;
        } catch (e) {
            console.warn(e);
        }

        url = this.getURL(true);
        const map = getJSONSync(url);
        this.state = { code: 2, value: map };
        return map;
    }

    getAsync(): Promise<TranslationMap> {
        switch (this.state.code) {
            case 0:
                const urlA = this.getURL();
                const urlB = this.getURL(true);

                const promise = getJSONAsync(urlA).catch((e) => {
                    console.warn(e);
                    return getJSONAsync(urlB)
                });

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
