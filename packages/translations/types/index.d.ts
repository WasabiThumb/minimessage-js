import { Locale } from "./locales";

type TranslationData = {
    readonly [key: string]: string;
};

export interface MinecraftTranslations {
    readonly version: string;
    list(): Locale[];
    get(locale: Locale): TranslationData;
    get(locale: string): TranslationData | null;
}

declare const MinecraftTranslations: MinecraftTranslations;
export default MinecraftTranslations;
export { Locale };
