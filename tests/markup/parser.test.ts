import { Test, runTests, assertEquals } from "../junit";
import {MarkupParser, MarkupParserEvent, MarkupStack} from "../../src/markup/parser";
import {Argument} from "../../src/markup/args";

class MarkupParserTest {

    @Test()
    basic() {
        const input = `Lorem <a>ipsum dolor sit <b:arg1:arg2>amet</b>, consectetur</a> adipiscing elit. <x/> Nullam non \\<ipsum\\> at ipsum lacinia varius.`;
        const expectedEvents: Partial<MarkupParserEvent>[] = [
            { type: "text",      content: "Lorem "                                                          },
            { type: "start_tag", name: "a",                                              selfClosing: false },
            { type: "text",      content: "ipsum dolor sit "                                                },
            { type: "start_tag", name: "b",                                              selfClosing: false },
            { type: "text",      content: "amet"                                                            },
            { type: "end_tag",   name: "b"                                                                  },
            { type: "text",      content: ", consectetur"                                                   },
            { type: "end_tag",   name: "a"                                                                  },
            { type: "text",      content: " adipiscing elit. "                                              },
            { type: "start_tag", name: "x",                                              selfClosing: true  },
            { type: "text",      content: " Nullam non <ipsum> at ipsum lacinia varius."                    },
        ];

        let head: number = 0;
        function receive(event: MarkupParserEvent) {
            expect(head).toBeLessThan(expectedEvents.length);
            const expected: Partial<MarkupParserEvent> = expectedEvents[head++];
            for (const key of Object.keys(expected) as (keyof MarkupParserEvent)[]) {
                assertEquals(event[key], expected[key]);
            }
        }

        const parser = new MarkupParser();

        parser.on("start_tag", receive);
        parser.on("end_tag", receive);
        parser.on("text", receive);

        parser.parse(input);
        parser.flush();
    }

    @Test()
    args() {
        const input = `Input to test <arg:aBc:DeF:72:81:0.5:true:false>argument parsing</arg>. :)`;
        const parser = new MarkupParser();

        parser.on("start_tag", (event) => {
            assertEquals(event.name, "arg");

            const args = event.args;
            let arg: Argument;

            assertEquals(args.pop().value, "aBc");
            assertEquals(args.pop().lowerValue, "def");
            assertEquals(args.pop().asInt().get(), 72);
            assertEquals(args.pop().asNumber().get(), 81);
            assertEquals(args.pop().asNumber().get(), 0.5);

            arg = args.pop();
            assertEquals(arg.isTrue(), true);
            assertEquals(arg.isFalse(), false);

            arg = args.pop();
            assertEquals(arg.isTrue(), false);
            assertEquals(arg.isFalse(), true);

            assertEquals(args.peek(), null);
        });

        parser.on("end_tag", (event) => {
            assertEquals(event.name, "arg");
            assertEquals(event.location, 69); // nice
        });

        parser.parse(input);
        parser.flush();
    }

}
runTests(MarkupParserTest);

//

class MarkupStackTest {

    @Test()
    basic() {
        const stack = new MarkupStack<number>();
        stack.push("a", 0);
        stack.push("b", 1);
        stack.push("c", 2);

        assertEquals(stack.peek(), 2);
        assertEquals(stack.pop("c"), 2);
        assertEquals(stack.peek(), 1);
        assertEquals(stack.pop("a"), 0);
        assertEquals(stack.pop("x"), null);
    }

    @Test.fail()
    strictNoMatchingEnd() {
        const stack = new MarkupStack<number>();
        stack.push("a", 0);
        stack.push("b", 1);
        stack.push("c", 2);

        stack.pop("b", true);
    }

    @Test.fail()
    strictNoMatchingStart() {
        const stack = new MarkupStack<number>();
        stack.pop("a", true);
    }

}
runTests(MarkupStackTest);