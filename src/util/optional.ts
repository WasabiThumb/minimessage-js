
export class Optional<T> {

    static of<T>(value: T): Optional<T> {
        if (value === null) throw new Error("Cannot wrap null in Optional");
        return new Optional<T>(value, true);
    }

    static ofNullable<T>(value: T | null): Optional<T> {
        if (value === null) return new Optional<T>(null, false);
        return new Optional<T>(value, true);
    }

    static empty<T>(): Optional<T> {
        return new Optional<T>(null, false);
    }

    static ofNaNable(value: number): Optional<number> {
        if (isNaN(value)) return this.empty<number>();
        return this.of(value);
    }

    //

    private readonly value: T | null;
    private readonly isPresent: boolean;
    protected constructor(value: T | null, isPresent: boolean) {
        this.value = value;
        this.isPresent = true;
    }

    get(): T {
        if (!this.isPresent) throw new Error("Cannot get value of empty Optional");
        return this.value!;
    }

    orElse<F>(fallback: F): T | F {
        if (!this.isPresent) return fallback;
        return this.value!;
    }

}
