/*
This is not a test, rather a utility used by other tests. All tests end in .test.ts
The purpose of this file is to adapt Jest to work a bit more like JUnit

I originally created this file for "enqr", see here:
https://github.com/WasabiThumb/enqr/blob/528d07445418d8d81b3bcfb9c83873903f3d499d/tests/junit.ts
This is because enqr's reference project is zxing, which was made in Java and uses JUnit. I decided to bring it here
since people familiar with MiniMessage may also likely be familiar with JUnit (and it's just plain nice).

Notable changes:
- The Test annotation (TS decorator) does not require any parameters, but must be written as @Test() rather than @Test.
- The Test annotation may take up to 1 parameter, which is the name of the test. When unspecified, the test name is the
  name of the method that the annotation was applied to.
- The Test annotation has some properties:
  - @Test.fail() : Asserts that the test should throw an error. Unlike Java, the standard library does not contain many
                   Error types, so no effort to distinguish between errors is made.
  - @Test.todo() : Marks a test as "todo", meaning that it has no implementation and will not be called.
- runTests must be called on test classes after their declaration.
- The name of the class is passed to jest.describe. If the class name ends with "Test", those characters are removed.
 */

type UtilAnnotation = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;

type UtilTest = {
    (name?: string): UtilAnnotation;
    fail(name?: string): UtilAnnotation;
    todo(name?: string): UtilAnnotation;
};

type Junit = {
    Test: UtilTest,
    runTests<T>(clazz: { new(): T }, name?: string): void;
    assertEquals<T>(a: T, b: T): void;
    assertSame<T>(a: T, b: T): void;
    assertTrue(v: any): void;
    assertFalse(v: any): void;
    assertNotNull<T>(v: T): Exclude<T, null>;
};

type Jest = {
    test: jest.It,
    describe: jest.Describe,
    expect: jest.Expect
};

const util: Junit = ((jest: Jest) => {

    const TestFunctionMagic = Symbol("TestFunctionMagic");
    enum TestType {
        BASIC = 0,
        FAIL = 1,
        TODO = 2
    }
    type TestFunction = Function & { _magic: symbol, _testName?: string, _testType: TestType };

    function TestFn(name?: string, type: TestType = TestType.BASIC): UtilAnnotation {
        // noinspection JSUnusedLocalSymbols
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            if (!(propertyKey in target)) return;
            let value: any = target[propertyKey];
            if (typeof value !== "function") throw new Error("@testFunc annotation applied to non-function");
            const func = value as unknown as TestFunction;
            func["_magic"] = TestFunctionMagic;
            func["_testName"] = name;
            func["_testType"] = type;
        };
    }

    let Test: UtilTest = TestFn as unknown as UtilTest;
    Test["fail"] = ((n) => TestFn(n, TestType.FAIL));
    Test["todo"] = ((n) => TestFn(n, TestType.TODO));

    function runTests<T>(clazz: { new(): T }, name?: string): void {
        if (typeof name !== "string") {
            name = clazz.name;
            if (name.endsWith("Test")) name = name.substring(0, name.length - 4);
        }
        jest.describe(name!, () => {
            const instance: T = new clazz();
            let v: any;
            for (let k of Object.getOwnPropertyNames(Object.getPrototypeOf(instance))) {
                v = instance[k as unknown as keyof T];
                if (typeof v !== "function") continue;
                const func: TestFunction = v as unknown as TestFunction;
                if (TestFunctionMagic === func["_magic"]) {
                    const name: string = func["_testName"] || k;
                    const type: TestType = func["_testType"];
                    const runner = (() => {
                        let out = func.apply(instance);
                        if (typeof out === "object" && "then" in out) {
                            return (out as unknown as Promise<unknown>).then<void>(() => {});
                        }
                    }) as unknown as jest.ProvidesCallback;

                    switch (type) {
                        case TestType.FAIL:
                            jest.test.failing(name, runner);
                            break;
                        case TestType.TODO:
                            jest.test.todo(name);
                            break;
                        default:
                            jest.test(name, runner);
                            break;
                    }
                }
            }
        });
    }

    function assertEquals<T>(a: T, b: T): void {
        jest.expect(a).toEqual(b);
    }

    function assertSame<T>(a: T, b: T): void {
        jest.expect(a).toBe(b);
    }

    function assertTrue(v: any): void {
        jest.expect(v).toBeTruthy();
    }

    function assertFalse(v: any): void {
        jest.expect(v).toBeFalsy();
    }

    function assertNotNull<T>(v: T): Exclude<T, null> {
        jest.expect(v).not.toBeNull();
        if (v === null) throw new Error();
        return v as unknown as Exclude<T, null>;
    }

    const ret: Junit = {
        Test,
        runTests,
        assertEquals,
        assertSame,
        assertTrue,
        assertFalse,
        assertNotNull
    };
    return ret;

})({ test, describe, expect });

export = util;
