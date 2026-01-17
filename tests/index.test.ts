import {DOMParser} from "linkedom";
import {JsonComponent} from "../src/serializer/json/types";
import {
    Component, HoverEvent,
    JsonComponentSerializer, Key,
    MiniMessage, NamedTextColor,
    PlainTextComponentSerializer, TextColor, TextDecoration,
    Translations
} from "../src";

//

const mini = MiniMessage.builder()
    .strict(true)
    .build();

const check = ((component: Component, expected: JsonComponent)=> {
    const json = JsonComponentSerializer.json().serialize(component);
    expect(json).toMatchObject(expected);
});

const renderToDom = ((mini: MiniMessage, component: Component) => {
    const document = (new DOMParser()).parseFromString(``, `text/html`);
    const container = document.createElement(`span`);
    // @ts-ignore
    mini.toHTML(component, container, (tag) => document.createElement(tag));
    return container;
});

//

test("deserialize", () => {
    let component: Component;

    component = mini.deserialize("<gold>this is gold and <b>bold</b>!</gold>");
    check(component, {
        text: "this is gold and ",
        color: "gold",
        extra: [
            {
                text: "bold",
                bold: true
            },
            "!"
        ]
    });
});

test("serialize", () => {
    let rich: string;
    let component: Component;

    //

    component = Component.empty()
        .color(NamedTextColor.GOLD)
        .append(Component.text("this is gold and "))
        .append(Component.text("bold").decorate(TextDecoration.BOLD))
        .append(Component.text("!"));

    rich = mini.serialize(component);
    expect(rich).toBe(`<gold>this is gold and <b>bold</b>!</gold>`);

    //

    component = Component.empty()
        .hoverEvent(HoverEvent.showText(Component.text("tooltip").color(NamedTextColor.DARK_PURPLE)))
        .color(TextColor.fromHexString("#aabb00"))
        .append(Component.translatable("block.minecraft.diamond_block"));

    rich = mini.serialize(component);
    expect(rich).toBe(`<#aabb00><hover:show_text:'<dark_purple>tooltip</dark_purple>'><lang:block.minecraft.diamond_block/></hover></#aabb00>`);
});

test("html escaping", () => {
    const component = Component.text("this is <p>NOT</p> HTML!");
    const html = mini.toHTML(component);
    expect(html).toContain(`this is &lt;p&gtNOT&lt;/p&gt HTML!`);
});

test("custom translations", () => {
    let tx: Translations;

    const run = ((key: string, args: (string | Component)[], out: string) => {
        const boxed: Component[] = new Array(args.length);
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (typeof arg === "object") {
                boxed[i] = arg;
            } else {
                boxed[i] = Component.text(`${arg}`);
            }
        }
        const translated = tx.translate(key, boxed);
        const plain = PlainTextComponentSerializer.plainText().serialize(translated);
        expect(plain).toBe(out);
    });

    tx = Translations.of({
        "test.one": "hello %s!",
        "test.two": "greetings to %2$s from %1$s!"
    });

    run(
        "test.one",
        ["world"],
        "hello world!"
    );

    run(
        "test.two",
        ["space", "you"],
        "greetings to you from space!"
    );
});

test("translations in rendered HTML", () => {
    const m = MiniMessage.builder()
        .translations({ "library.author": "Xavier %s" })
        .strict(true)
        .build();

    const component = m.deserialize("made with love by <lang:library.author:Pedraza/>!");
    const element = renderToDom(m, component);
    expect(element.innerText).toBe("made with love by Xavier Pedraza!");
});

test("tricky", () => {
   const component = mini.deserialize(`<rainbow>ra<i>i</i>n<b>b</b>ow</rainbow>`);
   const text = PlainTextComponentSerializer.plainText().serialize(component);
   expect(text).toBe(`rainbow`);
});

test("keys", () => {
    let key: Key;

    key = Key.key("test_key");
    expect(      key.namespace()).toBe("minecraft");
    expect(          key.value()).toBe("test_key");
    expect(key.asMinimalString()).toBe("test_key");
    expect(       key.asString()).toBe("minecraft:test_key");
    expect(       key.toString()).toBe("minecraft:test_key")
    expect(      `${key}`).toBe("minecraft:test_key");
    expect(             "" + key).toBe("minecraft:test_key");

    key = Key.key("foo:test_key");
    expect(      key.namespace()).toBe("foo");
    expect(          key.value()).toBe("test_key");
    expect(key.asMinimalString()).toBe("foo:test_key");
    expect(       key.asString()).toBe("foo:test_key");
    expect(       key.toString()).toBe("foo:test_key")
    expect(      `${key}`).toBe("foo:test_key");
    expect(             "" + key).toBe("foo:test_key");
});
