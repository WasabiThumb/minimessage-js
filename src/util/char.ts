
export type CharacterLike = Character | number | string;

export interface Character {
    readonly value: number;
    compare(other: CharacterLike): number;
    is(other: CharacterLike): boolean;
    indexIn(string: string): number;
    toString(): string;
}

//

function normalize(value: any): Character {
    let n: number;
    switch (typeof value) {
        case "object":
            if (value === null) throw new Error(`Cannot interpret null as Character`);
            if (value instanceof CharacterImpl) return value;
            if ("value" in value) {
                const n = value["value"];
                if (typeof n === "number") return new CharacterImpl(n);
            }
            throw new Error(`Value (${value}) is not a Character`);
        case "number":
            n = value;
            break;
        case "string":
            const { length } = value;
            if (length !== 1) throw new Error(`Character string should have a length of 1 (got ${length})`);
            n = value.charCodeAt(0);
            break;
        default:
            throw new Error(`Cannot create Character from value of type \"${typeof value}\"`);
    }

    if (!Number.isSafeInteger(n) || n < 0x0000 || n > 0xFFFF)
        throw new Error(`Illegal Character value: ${n}`);

    return new CharacterImpl(n);
}

class CharacterImpl implements Character {

    private readonly _buf: Uint16Array;

    constructor(value: number) {
        this._buf = new Uint16Array(1);
        this._buf[0] = value;
    }

    //

    get value(): number {
        return this._buf[0];
    }

    compare(other: CharacterLike): number {
        return this.value - normalize(other).value;
    }

    is(other: CharacterLike): boolean {
        return this.value === normalize(other).value;
    }

    indexIn(string: string): number {
        const { value } = this;
        for (let i = 0; i < string.length; i++) {
            if (string.charCodeAt(i) === value) return i;
        }
        return -1;
    }

    toString(): string {
        return String.fromCharCode(this.value);
    }

    [Symbol.toPrimitive](hint: string) {
        if (hint === "number") return this.value;
        return this.toString();
    }

    get [Symbol.toStringTag](): string {
        return `Character`;
    }

}

//

type CharacterExport = ((value: CharacterLike) => Character) & Readonly<Record<KnownCharacter, Character>>;
type KnownCharacter = "LESS_THAN" | "GREATER_THAN" | "SEMICOLON" | "QUOTATION" | "APOSTROPHE" | "AMPERSAND" |
    "COLON" | "NUMBER_SIGN" | "BACKSLASH" | "DOLLAR_SIGN" | "ZERO" | "ONE" | "NINE" | "LOWERCASE_A" | "LOWERCASE_S" |
    "LOWERCASE_F" | "UPPERCASE_A" | "UPPERCASE_F" | "DASH" | "PERCENT" | "SLASH" | "SECTION" | "PERIOD" | "COMMA" |
    "LOWERCASE_R" | "LOWERCASE_K" | "LOWERCASE_O" | "UPPERCASE_Z" | "SPACE" | "UNDERSCORE" | "LOWERCASE_Z" | "NEWLINE";

export const Character: CharacterExport = ((known: Record<KnownCharacter, string>) => {
    let ret = normalize;
    for (const key of Object.keys(known)) {
        const value = normalize(known[key as KnownCharacter]);
        Object.defineProperty(ret, key, {
            value,
            configurable: false,
            enumerable: true,
            writable: false
        });
    }
    return ret as unknown as CharacterExport;
})({
    LESS_THAN: `<`,
    GREATER_THAN: `>`,
    SEMICOLON: `;`,
    QUOTATION: `"`,
    APOSTROPHE: `'`,
    AMPERSAND: `&`,
    COLON: `:`,
    NUMBER_SIGN: `#`,
    BACKSLASH: `\\`,
    DOLLAR_SIGN: `$`,
    ZERO: `0`,
    ONE: `1`,
    NINE: `9`,
    LOWERCASE_A: `a`,
    LOWERCASE_S: `s`,
    LOWERCASE_F: `f`,
    UPPERCASE_A: `A`,
    UPPERCASE_F: `F`,
    DASH: `-`,
    PERCENT: `%`,
    SLASH: `/`,
    SECTION: `§`,
    LOWERCASE_K: 'k',
    LOWERCASE_R: 'r',
    LOWERCASE_O: 'o',
    UPPERCASE_Z: 'Z',
    SPACE: ' ',
    UNDERSCORE: '_',
    LOWERCASE_Z: 'z',
    PERIOD: '.',
    COMMA: ',',
    NEWLINE: `\n`,
});
