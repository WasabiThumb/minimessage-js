import data from "./data.mjs";

//

class MinecraftTranslationsImpl {

    get version() {
        return data.version;
    }

    list() {
        return [...data.locales];
    }

    get(locale) {
        const { translations } = data;
        if (locale in translations) return translations[locale];
        return null;
    }

}

const MinecraftTranslations = new MinecraftTranslationsImpl();
export default MinecraftTranslations;
