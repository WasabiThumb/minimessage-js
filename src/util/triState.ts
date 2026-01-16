
export type TriState = typeof TriState.TRUE |
    typeof TriState.FALSE |
    typeof TriState.NOT_SET;

export namespace TriState {

    export const TRUE = "true";
    export const FALSE = "false";
    export const NOT_SET = "not_set";

    //

    export function of(value: boolean): TriState {
        return value ? TRUE : FALSE;
    }

    export function resolve(triState: TriState, fallback: boolean): boolean {
        if (TRUE === triState) return true;
        if (FALSE === triState) return false;
        return fallback;
    }

}
