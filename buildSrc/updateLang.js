/*
 * Read the vanilla lang files for the purpose of rendering translatable components
 */

const { getAssetsFromLatestIndex, getAssetsFromLatestClientJAR } = require("./lib/mojangResources");
const path = require("node:path");
const stream = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { createWriteStream } = require("node:fs");
const { writeFile, open } = require("node:fs/promises");

/**
 * @return {Promise<{ name: string, size: number, get(): Promise<Readable> }[]>}
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
            return Promise.resolve(stream.Readable.from(english));
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

async function writeLocales(localesFile, names, andConstants) {
    const writeOps = { encoding: "utf-8" };
    const fh = await open(localesFile, "w");
    await fh.writeFile(
        "/*\n * THIS IS AN AUTOMATICALLY GENERATED FILE!\n" +
        " * DO NOT EDIT MANUALLY!\n" +
        " * SEE buildSrc/updateLang.js\n" +
        "*/\n" +
        "export type Locale = ",
        { encoding: "utf-8" }
    );
    for (let i=0; i < names.length; i++) {
        const name = names[i];
        if (i !== 0) await fh.writeFile(" | ", writeOps);
        await fh.writeFile(`\"${name}\"`, writeOps);
    }
    await fh.writeFile(";\n", writeOps);
    if (andConstants) {
        await fh.writeFile("export const Locales: Locale[] = [ ", writeOps);
        for (let i=0; i < names.length; i++) {
            const name = names[i];
            if (i !== 0) await fh.writeFile(", ", writeOps);
            await fh.writeFile(`\"${name}\"`, writeOps);
        }
        await fh.writeFile(" ];\n", writeOps);
    }
    await fh.close();
}

async function main() {
    const packageDir = path.join(path.resolve(__dirname, ".."), "packages/translations");

    console.log("Updating lang files...");
    const translationDataDir = path.join(packageDir, "data");
    const langs = await getLangs();

    console.log("Found " + (langs.length) + " lang files");
    const names = langs.map((lang) => lang.name).sort();

    console.log("Writing list.json");
    const listFile = path.join(translationDataDir, "list.json");
    await writeFile(listFile, JSON.stringify(names), { flag: "w", encoding: "utf-8" });

    console.log("Writing locales.d.ts");
    const localesFile = path.join(packageDir, "types/locales.d.ts");
    await writeLocales(localesFile, names, false);

    console.log("Writing locales.ts");
    const localesFile2 = path.join(path.resolve(__dirname, ".."), "packages/fetch-translations/src/locales.ts");
    await writeLocales(localesFile2, names, true);

    const allDir = path.join(translationDataDir, "all");
    for (let lang of langs) {
        console.log(`Writing all/${lang.name}.json`);

        const size = lang.size;
        const dest = path.join(allDir, `${lang.name}.json`);
        const input = await lang.get();
        const output = createWriteStream(dest, { flags: "w" });
        let read = 0;

        await pipeline(
            input,
            new stream.Transform({
                transform(chunk, encoding, callback) {
                    read += chunk.length;
                    console.log(` - ${read} / ${size} (${((read / size) * 100).toFixed(1)}%)`);

                    this.push(chunk);
                    callback();
                }
            }),
            output
        );
    }
}

if (require.main === module) {
    main().catch(console.error);
}
