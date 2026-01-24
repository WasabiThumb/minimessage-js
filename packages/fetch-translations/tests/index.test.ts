import MinecraftTranslations from "../src";

//

/** Keys we can expect the translation data to have */
const KNOWN_KEYS = (<T extends string>(...keys: T[]) => {
    return Object.freeze(keys);
})(
    "title.credits",
    "block.minecraft.diamond_block",
    "item.minecraft.carrot_on_a_stick",
);

/** A single member of KNOWN_KEYS */
type KnownKey = typeof KNOWN_KEYS extends (infer T)[] ? T : never;

/** A map of KNOWN_KEYS to their lang string */
type KnownTranslationData = {
    [K in KnownKey]: string
};

/** Ensure that some translation data has all the known keys */
function validateTranslationData(data: Record<string, string>): KnownTranslationData {
    for (const key of KNOWN_KEYS) expect(typeof data[key]).toBe("string");
    return data as KnownTranslationData;
}

/** Ensure that 2 objects have the same values for each of the known keys */
function checkTranslationData(a: KnownTranslationData, b: KnownTranslationData) {
    for (const key of KNOWN_KEYS) {
        expect(a[key as KnownKey]).toBe(b[key as KnownKey]);
    }
}

/**
 * The library should provide a sorted list,
 * but that sorting is optimized and non-standard.
 * This is an un-optimized and standard approach to
 * ensure that the list is actually sorted properly.
 */
function checkSorted(list: string[]): void {
    const copy = [...list];
    copy.sort();
    for (let i = 0; i < list.length; i++) {
        expect(list[i]).toBe(copy[i]);
    }
}

//

test("list", async () => {
    const list = await MinecraftTranslations.list();
    checkSorted(list);
    expect(list).not.toHaveLength(0);
    expect(list).toContain("en_us");
    expect(list).toContain("en_gb");
});

test("fetch en_us", async () => {
    const en = await MinecraftTranslations.get("en_us");
    const actual: KnownTranslationData = validateTranslationData(en);
    const expected: KnownTranslationData = {
        "title.credits": "Copyright Mojang AB. Do not distribute!",
        "block.minecraft.diamond_block": "Block of Diamond",
        "item.minecraft.carrot_on_a_stick": "Carrot on a Stick",
    };
    checkTranslationData(actual, expected);
});

test("fetch fr_ca", async () => {
    const en = await MinecraftTranslations.get("fr_ca");
    const actual: KnownTranslationData = validateTranslationData(en);
    const expected: KnownTranslationData = {
        "title.credits": "Copyright Mojang AB. Ne pas distribuer!",
        "block.minecraft.diamond_block": "Bloc de diamant",
        "item.minecraft.carrot_on_a_stick": "Carotte sur un bâton",
    };
    checkTranslationData(actual, expected);
});
