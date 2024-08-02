# @minimessage-js/fetch-translations

Provides vanilla translations for use in [minimessage-js](https://www.npmjs.com/package/minimessage-js)
by using HTTP requests as needed. This is unlike [@minimessage-js/translations](https://www.npmjs.com/package/@minimessage-js/translations),
which comes bundled with *every* translation. They are designed to be
API compatible, with the main difference being that ``get`` will heavily block.
``getAsync`` is highly preferred.

Unlike ``@minimessage-js/translations``, this package offers a UMD build. The other
package does not offer one because the idea of using it in a browser is repulsive.
When using in a browser, you can access the library using the global constant
``MiniMessageTranslations``.

Another difference is that ``get``/``getAsync`` is not guaranteed to throw if you provide
an unrecognized lang string. It will attempt to fetch the data from the API anyways, and throw
only if it is not found. ``has``/``list`` can still be used for basic validation.

## Usage
```js
const MiniMessage = require("minimessage-js");
const MiniMessageTranslations = require("@minimessage-js/fetch-translations");

(async () => {
    // Fetch American English translations
    // This is memoised, so subsequent calls complete instantly.
    // You can also use "get", but it's a really bad idea.
    const english = await MiniMessageTranslations.getAsync("en-us");
    
    const mm = MiniMessage.builder()
        // Add American English translations
        .translations(english)
        .build();

    const component = mm.deserialize(`<lang:block.minecraft.diamond_block>`);
    // { translate: "block.minecraft.diamond_block" }

    const html = MiniMessage.toHTML(component);
    // <span>Block of Diamond</span>
})().catch(console.error);
```

## Dependencies
- ``sync-request`` : To allow ``get`` to work on Node. Browsers use sync
  ``XMLHttpRequest`` and this dependency is excluded from the browser build. Both
  platforms support ``getAsync`` without blocking.
