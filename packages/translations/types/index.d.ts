import {Locale} from "./locales";

/**
 * The content of a lang file, e.g. ``en_us.json``.
 * The keys are a translatable key, and the values are the translated plain text with optional placeholders (%s).
 */
type TranslationMap = {
    [key: string]: string
};

/**
 * @see get
 * @see list
 * @see has
 */
interface ITranslations {

    /**
     * Lists all known locale strings.
     * @see list
     */
    list(): Locale[];
    /**
     * Checks if the given locale name points to a valid locale.
     * @param key The locale string (e.g. ``en_us``).
     */
    has(key: Locale | string): boolean;

    /**
     * Gets the translation map for the given locale asynchronously.
     * Throws if locale does not exist.
     * @param key The locale string (e.g. ``en_us``).
     * @see get
     */
    getAsync(key: Locale | string): Promise<TranslationMap>;

    /**
     * Gets the translation map for the given locale.
     * Throws if locale does not exist.
     * @param key The locale string (e.g. ``en_us``).
     * @see getAsync
     */
    get(key: Locale | string): TranslationMap;

}

declare const Translations: ITranslations;

export = Translations;
