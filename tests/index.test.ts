import { Test, runTests, assertEquals } from "./junit";
import MiniMessage from "../src";
import {IComponent} from "../src/component/spec";

class MiniMessageTest {

    @Test()
    basic() {
        const mm = MiniMessage.miniMessage();
        const src = `<green>Green and <b>bold</b> text</green>`;
        const component = mm.deserialize(src);

        const expected = {
            text: "Green and ",
            extra: [
                {
                    text: "bold",
                    bold: true
                },
                " text"
            ],
            color: "green"
        };
        assertEquals(component.toJSON(), expected);
    }

    @Test()
    reset() {
        const mm = MiniMessage.builder().build();
        const src = `<red>Red text<reset/>Reset text`;
        const component = mm.deserialize(src);

        const expected = {
            extra: [
                { text: 'Red text', color: 'red' },
                'Reset text'
            ]
        };

        assertEquals(component.toJSON(), expected);
    }

    @Test()
    gradient() {
        const mm = MiniMessage.miniMessage();
        const src = `<gradient:dark_red:dark_blue>awesome gradient</gradient>`;
        const component = mm.deserialize(src);

        const expected = {
            extra: [
                { text: 'a', color: '#AA0000' },
                { text: 'w', color: '#9F000B' },
                { text: 'e', color: '#930017' },
                { text: 's', color: '#880022' },
                { text: 'o', color: '#7D002D' },
                { text: 'm', color: '#710039' },
                { text: 'e', color: '#660044' },
                { text: ' ', color: '#5B004F' },
                { text: 'g', color: '#4F005B' },
                { text: 'r', color: '#440066' },
                { text: 'a', color: '#390071' },
                { text: 'd', color: '#2D007D' },
                { text: 'i', color: '#220088' },
                { text: 'e', color: '#170093' },
                { text: 'n', color: '#0B009F' },
                { text: 't', color: '#0000AA' }
            ]
        };

        assertEquals(component.toJSON(), expected);
    }

    // For all test cases, the output is EXTREMELY CLOSE. However checking strict equality will cause the test to fail
    // due to tiny differences, like components without text having an empty string field rather than no field,
    // and literal colors like "green" always being preserved rather than hexed.
    private async getOfficial(src: string): Promise<IComponent> {
        return fetch(`https://webui.advntr.dev/api/mini-to-json`, {
            method: "POST",
            body: JSON.stringify({
                miniMessage: src,
                placeholders: { stringPlaceholders: {} }
            })
        }).then((r) => r.json())
            .then<IComponent>((json) => json as unknown as IComponent);
    }

}

runTests(MiniMessageTest);
