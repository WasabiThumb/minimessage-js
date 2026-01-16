
type ErrorConstructor = {
    new(message: string, options: { cause?: unknown }): Error;
};

export interface ErrorInfo {

    readonly name: string;

    readonly message: string;

    readonly cause?: any;

    toError(type?: ErrorConstructor): Error;

}

//

export namespace ErrorInfo {

    const IS_ERROR_INFO = Symbol("IS_ERROR_INFO");
    const FALLBACK_NAME = "Error";

    const isError = "isError" in Error ? ((e: object) => {
        return Error.isError(e);
    }) : ((e: object) => {
        return e instanceof Error;
    });

    //

    export function of(thrown: any): ErrorInfo {
        let thrownIsError: boolean = false;
        let name: string = FALLBACK_NAME;
        let hasCause: boolean;
        let message: string;

        if (typeof thrown === "object") {
            if (thrown === null) {
                hasCause = false;
                message = "null";
            } else {
                if (IS_ERROR_INFO in thrown && thrown[IS_ERROR_INFO]) return thrown as ErrorInfo;
                hasCause = "cause" in thrown;
                if (isError(thrown)) {
                    thrownIsError = true;
                    const qual = thrown as Error;
                    name = qual.name;
                    message = qual.message;
                } else {
                    const className = thrown.constructor.name;
                    if ("Object" !== className) name = className;
                    message = thrown.toString();
                }
            }
        } else {
            hasCause = false;
            message = String(thrown);
        }

        const ret: ErrorInfo = {
            name,
            message,
            toError(type): Error {
                if (thrownIsError) return thrown as unknown as Error;
                const ret: Error = !!type ?
                    new (Function.prototype.bind.apply(type, [ message, this ])) :
                    new Error(message, this);
                if (name !== ret.name) ret.name = name;
                return ret;
            }
        };
        if (hasCause) {
            Object.defineProperty(ret, "cause", {
                get(): any {
                    return (thrown as unknown as ErrorInfo)["cause"];
                },
                enumerable: true
            });
        }
        Object.defineProperty(ret, IS_ERROR_INFO, {
            value: true,
            writable: false,
            enumerable: false
        });
        return Object.freeze(ret);
    }

}

//

export function toError(thrown: any, type?: ErrorConstructor): Error {
    return ErrorInfo.of(thrown).toError(type);
}


