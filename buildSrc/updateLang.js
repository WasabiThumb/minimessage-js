/*
 * Read the vanilla lang files for the purpose of rendering translatable components
 */

const { getAssetsFromLatestIndex, getAssetsFromLatestClientJAR } = require("./lib/mojangResources");

/**
 * @return {Promise<{ name: string, size: number, get(): Promise<Buffer> }[]>}
 */
async function getLangs() {
    let ret = [];

    const englishKey = "assets/minecraft/lang/en_us.json";
    const englishReceiver = { [englishKey]: null };
    await getAssetsFromLatestClientJAR(englishReceiver);

    /** @type {Buffer | null} */
    const english = englishReceiver[englishKey];
    if (english === null) throw new Error("English lang file not found in latest client JAR");

    ret.push({
        name: "en_us",
        size: english.byteLength,
        get() {
            return Promise.resolve(english);
        }
    });

    const index = await getAssetsFromLatestIndex(/^minecraft\/lang\/([a-z_]+)\.json$/);
    for (let entry of index) {
        ret.push({
            name: entry.match[1],
            size: entry.size,
            get: entry.get
        });
    }

    return ret;
}

// TODO
getLangs().then(console.log).catch(console.error);
