
export interface PreProcessTag {
    readonly type: "preProcess"
    value(): string
}

export class PreProcessTagImpl implements PreProcessTag {

    readonly type = "preProcess";

    constructor(
        private readonly _value: string
    ) { }

    //

    value(): string {
        return this._value;
    }

}
