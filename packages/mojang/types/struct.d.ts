
export declare interface Asset {
    path: string;
    hash: string;
    size: number;
    download(): Promise<ReadableStream<Uint8Array>>;
    downloadAsJson<T>(): Promise<T>;
    downloadAsString(): Promise<string>;
}

export type Assets<P extends string> = {
    readonly [p in P]: Asset
};

export declare interface Version {
    id: string;
    getResource(path: string): Promise<Uint8Array | null>;
    getAssets(): Promise<Assets<string>>;
    getAssets<P extends string>(...paths: P[]): Promise<Assets<P>>;
    getAssets(predicate: (path: string) => boolean): Promise<Assets<string>>;
}

export declare interface MojangAPI {
    getRelease(): Promise<Version | null>;
    getLatestRelease(): Promise<Version>;
    getLatestSnapshot(): Promise<Version>;
}
