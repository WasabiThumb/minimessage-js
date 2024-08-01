# minimessage-js
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/WasabiThumb/minimessage-js/node.js.yml)
![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/WasabiThumb/minimessage-js)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fwasabithumb.github.io%2Fminimessage-js%2F&label=demo)
![npm bundle size](https://img.shields.io/bundlephobia/min/minimessage-js)

[Online Demo](https://wasabithumb.github.io/minimessage-js/) &bull; [NPM](https://www.npmjs.com/package/minimessage-js) &bull; [GitHub](https://github.com/WasabiThumb/minimessage-js) &bull; [Spec](https://docs.advntr.dev/minimessage/format.html)

![Demo GIF](https://raw.githubusercontent.com/WasabiThumb/minimessage-js/master/doc/demo.gif)

A deserializer mirroring the [MiniMessage API](https://docs.advntr.dev/minimessage/api.html),
combined with an HTML renderer, in pure JS. 
Compare to [minimessage-2-html](https://www.npmjs.com/package/minimessage-2-html), which works by
sending web requests to the official webui.

## Usage
### NodeJS
```js
// es6
import MiniMessage from "minimessage-js";
// cjs
const MiniMessage = require("minimessage-js");

const component = MiniMessage.miniMessage().deserialize(`<rainbow>hello world!</rainbow>`);
component.getProperty("extra"); // [ { text: "h", color: "#ff0000" }, ... ]
const htmlCode = MiniMessage.toHTML(component); // string containing HTML code
```
The API is also designed to be able to theoretically support DOM polyfills like [JSDOM](https://www.npmjs.com/package/jsdom):
```js
const { JSDOM } = require("jsdom");
const dom = new JSDOM();

const output = dom.document.createElement("p");
MiniMessage.toHTML(component, output, (tag) => dom.document.createElement(tag));
```

### Browser
This package includes a browser build. Add ``minimessage.min.js`` to your document, and
``MiniMessage`` will be exposed as a global variable. Then the library can be used like
[NodeJS](#nodejs).
```html
<script src="https://unpkg.com/minimessage-js@^1.0"></script>
<p id="out"></p>
<script>
    MiniMessage.toHTML(
        MiniMessage.miniMessage().deserialize('<rainbow>hello world!</rainbow>'),
        document.querySelector("#out")
    ); // also returns the HTML code as a string
</script>
```

## Translations
Translations can be registered, which will take effect when [rendering to HTML](#html-rendering).
You can add your own translations or optionally require the [vanilla translations](https://www.npmjs.com/package/@minimessage-js/translations)
(warning: it's quite big).

```js
const Translations = require("@minimessage-js/translations");

const mm = MiniMessage.builder()
    // Add American English translations
    .translations(Translations.get("en-us"))
    // Add custom translations
    .translations({ "greeting": "Hello %s!" })
    .build();

const component = mm.deserialize("<lang:greeting:Paul> You are " +
        "holding a <lang:block.minecraft.diamond_block>!");

const html = MiniMessage.toHTML(component);
/*
<span>
    <span data-mm-translate="greeting" data-mm-with="[\"Paul\"]">
        Hello Paul!
    </span>
    <span> You are holding a </span>
    <span data-mm-translate="block.minecraft.diamond_block">
        Block of Diamond
    </span>
    <span>!</span>
</span>
*/
```

## HTML Rendering
As mentioned above, this package has an extra method not found in the original API:
``MiniMessage.toHTML``. This converts the parsed Component object into nested ``<span>`` tags,
wtih attributes set to apply the Component data. You can also pass an ``HTMLElement``, which will
receive the tags in a way that may be more efficient than setting it through ``innerHTML``. This also will
cause [obfuscated text](#obfuscation) to render properly. Here is an overview of how the implemented
properties parse to HTML:

### Color
``style="color: #XXXXXX"`` is set on the target `<span>`. This also supports color literals
through the following conversion:

| Key              | Color                                                    | Hex Code    |
| :--------------: | :------------------------------------------------------: | :---------: |
| ``black``        | ![#000000](https://placehold.co/15x15/000000/000000.svg) | ``#000000`` |
| ``dark_blue``    | ![#0000aa](https://placehold.co/15x15/0000aa/0000aa.png) | ``#0000aa`` |
| ``dark_green``   | ![#00aa00](https://placehold.co/15x15/00aa00/00aa00.png) | ``#00aa00`` |
| ``dark_aqua``    | ![#00aaaa](https://placehold.co/15x15/00aaaa/00aaaa.png) | ``#00aaaa`` |
| ``dark_red``     | ![#aa0000](https://placehold.co/15x15/aa0000/aa0000.png) | ``#aa0000`` |
| ``dark_purple``  | ![#aa00aa](https://placehold.co/15x15/aa00aa/aa00aa.png) | ``#aa00aa`` |
| ``gold``         | ![#ffaa00](https://placehold.co/15x15/ffaa00/ffaa00.png) | ``#ffaa00`` |
| ``gray``         | ![#aaaaaa](https://placehold.co/15x15/aaaaaa/aaaaaa.png) | ``#aaaaaa`` |
| ``dark_gray``    | ![#555555](https://placehold.co/15x15/555555/555555.png) | ``#555555`` |
| ``blue``         | ![#5555ff](https://placehold.co/15x15/5555ff/5555ff.png) | ``#5555ff`` |
| ``green``        | ![#55ff55](https://placehold.co/15x15/55ff55/55ff55.png) | ``#55ff55`` |
| ``aqua``         | ![#55ffff](https://placehold.co/15x15/55ffff/55ffff.png) | ``#55ffff`` |
| ``red``          | ![#ff5555](https://placehold.co/15x15/ff5555/ff5555.png) | ``#ff5555`` |
| ``light_purple`` | ![#ff55ff](https://placehold.co/15x15/ff55ff/ff55ff.png) | ``#ff55ff`` |
| ``yellow``       | ![#ffff55](https://placehold.co/15x15/ffff55/ffff55.png) | ``#ffff55`` |
| ``white``        | ![#ffffff](https://placehold.co/15x15/ffffff/ffffff.png) | ``#ffffff`` |

### Decorations (except [obfuscated](#obfuscation))
A CSS style declaration ``property: value;`` is added to the target ``<span>``'s style attribute.

| Name              | Declaration                       |
| :---------------: | :-------------------------------: |
| ``bold``          | ``font-weight: bold``             |
| ``italic``        | ``font-style: italic``            |
| ``underlined``    | ``text-decoration: underline``    |
| ``strikethrough`` | ``text-decoration: line-through`` |

MiniMessage also allows for decoration inversions, e.g. ``<!bold>`` or ``<u:false>``. In this case,
the appropriate property is set to ``normal`` or ``none`` only if it was previously set in a higher
enclosure.

### Obfuscation
The property ``data-mm-obfuscted`` is set to ``true`` on the ``<span>``. If outputting to an ``HTMLElement``,
using in browser, the element is connected to the DOM, and 1 animation frame has ocurred, the
content of the ``<span>`` is converted into ``<canvas>`` elements which will render the obfuscation effect.

### Everything Else
Remaining properties ``propertyName`` will have ``data-mm-property-name`` set to a JSON string containing the value of the property
if one is set. Examples:

| Property                                                                       | HTML Attribute      | Example Value                                            |
| :----------------------------------------------------------------------------: | :-----------------: | :------------------------------------------------------: |
| ``clickEvent``[*](https://docs.advntr.dev/minimessage/format.html#click)       | data-mm-click-event | ``{ "action": "suggest_command", "value": "/kill @s" }`` |
| ``hoverEvent``[*](https://docs.advntr.dev/minimessage/format.html#hover)       | data-mm-hover-event | ``{ "action": "show_text", "contents": "hello!" }``      |
| ``keybind``[*](https://docs.advntr.dev/minimessage/format.html#keybind)        | data-mm-keybind     | ``"key.jump"``                                           |
| ``translate``[*](https://docs.advntr.dev/minimessage/format.html#translatable) | data-mm-translate   | ``"block.minecraft.diamond_block"``                      |
| ``with`` (for ``translate``)                                                   | data-mm-with        | ``["<red>1", "<blue>Stone!"]``                           |
| ``selector``[*](https://docs.advntr.dev/minimessage/format.html#selector)      | data-mm-selector    | ``"@s"``                                                 |
| ``score``[*](https://docs.advntr.dev/minimessage/format.html#score)            | data-mm-score       | ``{ "name": "@s", "objective": "kills" } ``              |
| ``insertion``[*](https://docs.advntr.dev/minimessage/format.html#insertion)    | data-mm-insertion   | ``"some text"``                                          |
| ``font``[*](https://docs.advntr.dev/minimessage/format.html#font)              | data-mm-font        | ``"uniform"``                                            |
| ``nbt``[*](https://docs.advntr.dev/minimessage/format.html#nbt)                | data-mm-nbt         | ``"entity"``                                             |
| ``block`` (for ``nbt`` = ``"block"``)                                          | data-mm-block       | unknown (help wanted)                                    |
| ``entity`` (for ``nbt`` = ``"entity"`` )                                       | data-mm-entity      | ``"@s"``                                                 |
| ``storage`` (for ``nbt`` = ``"storage"``)                                      | data-mm-storage     | unknown (help wanted)                                    |
| ``interpret`` (for ``nbt``)                                                    | data-mm-interpret   | ``false``                                                |
| ``separator`` (for ``nbt``)                                                    | data-mm-separator   | ``","``                                                  |

## Does it work?
``minimessage-js`` uses output from the official WebUI to validate test cases. Over all implemented
tags, no instance has been found where the 2 outputs do not *fuzzy match*. The main differences
are:
- This library always hex-ifies color literals, e.g. ``red`` -> ``#ff5555``, whereas MiniMessage
  tends to keep color literals unconverted.
- This library sometimes may not include the ``text`` property on empty Components, whereas MiniMessage
  tends to add an empty string.

## What's missing?
Currently, there is no ``MiniMessageInstance.serialize``. Since there is no way to create ``Component``s
directly, it doesn't make much sense to include.

## License
```text
Copyright 2024 Wasabi Codes

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```