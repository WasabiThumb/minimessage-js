
export interface ParserDirectiveTag {
    readonly type: "directive"
}

//

export namespace ParserDirectiveTag {

    function newTag(): ParserDirectiveTag {
        return Object.seal({
            type: "directive",
            uid: Symbol()
        });
    }

    /** Instructs the parser to reset all style, events, insertions, etc. */
    export const RESET = newTag();

}
