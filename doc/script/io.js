// Used by the web demo to make inputs & outputs work

((window) => {
    const document = window.document;

    const { builder, toHTML, tags } = MiniMessage;

    let builderParams = {
        "tags": tags.defaults(),
        "translations": {}
    };
    let mm;

    let onRefresh = (() => {});
    function refreshMM() {
        const b = builder();
        for (const k of Object.keys(builderParams)) {
            b[k](builderParams[k]);
        }
        mm = b.build();
        onRefresh();
    }
    refreshMM();

    /**
     * @param key {"tags" | "translations"}
     * @param value {any}
     */
    function setParam(key, value) {
        builderParams[key] = value;
        refreshMM();
    }

    // START Load translations
    const userLangs = ((navigator) => {
        return navigator.languages || ((!!navigator.language) && [ navigator.language ]) || [];
    })(typeof navigator === "object" ? navigator : window["navigator"]);

    console.log("Available translations", MiniMessageTranslations.list());
    console.log("User languages", userLangs);

    let targetLang = "en_us";
    for (let lang of userLangs) {
        if (MiniMessageTranslations.has(lang)) {
            targetLang = lang;
            break;
        }
    }

    console.log(`Loading ${targetLang} translations...`)
    MiniMessageTranslations.getAsync(targetLang).then((translations) => {
        console.log(`Loaded ${targetLang} translations!`);
        setParam("translations", translations);
    }).catch(console.error);
    // END Load translations

    window.addEventListener("DOMContentLoaded", () => {
        /** @type {HTMLTextAreaElement} */
        const input = document.querySelector("#input");
        if (!input) return;

        let outputs = {};
        for (let outputType of ["dom", "json", "raw"]) {
            if (!(outputs[outputType] = document.querySelector(`#output-${outputType}`))) return;
        }

        /**
         * @param type {"dom" | "json" | "raw"}
         * @return {HTMLElement}
         */
        function getOutput(type) {
            return outputs[type];
        }

        function update() {
            const domOutput = getOutput("dom");
            domOutput.innerHTML = "";
            let component;
            try {
                component = mm.deserialize(input.value);
            } catch (e) {
                console.trace(e);
                return;
            }
            getOutput("raw").innerText = toHTML(component, domOutput);
            getOutput("json").innerText = JSON.stringify(component.toJSON(), null, '\xa0');
        }
        input.addEventListener("input", update);
        onRefresh = update;

        /*
        // Display a sample
        input.value = atob(`PGJsYWNrPjA8L2JsYWNrPiA8ZGFya19ncmF5Pjg8L2RhcmtfZ3JheT4gPGRhcmtfYmx1ZT4xPC9kYXJrX2JsdWU+IDxibHVlPjk8L2JsdWU+CjxkYXJrX2dyZWVuPjI8L2RhcmtfZ3JlZW4+IDxncmVlbj5hPC9ncmVlbj4gPGRhcmtfYXF1YT4zPC9kYXJrX2FxdWE+IDxhcXVhPmI8L2FxdWE+CjxkYXJrX3JlZD40PC9kYXJrX3JlZD4gPHJlZD5jPC9yZWQ+IDxkYXJrX3B1cnBsZT41PC9kYXJrX3B1cnBsZT4gPGxpZ2h0X3B1cnBsZT5kPC9saWdodF9wdXJwbGU+Cjxnb2xkPjY8L2dvbGQ+IDx5ZWxsb3c+ZTwveWVsbG93PiA8Z3JheT43PC9ncmF5PiA8d2hpdGU+Zjwvd2hpdGU+Cgo8Yj48I2ZmMDAwMD5SPCMwMGZmMDA+RzwjMDAwMGZmPkI8cmVzZXQ+IG1ha2VzIDxiPjwjMDBmZmZmPkM8I2ZmMDBmZj5NPCNmZmZmMDA+WTxyZXNldD4KCjxiPmJvbGQ8L2I+IDxpPml0YWxpYzwvaT4gPHU+dW5kZXJsaW5lZDwvdT4gPHN0PnN0cmlrZXRocm91Z2g8L3N0Pgo8Yj48aT5ib2xkIDwhYj48IWk+JjwvIWk+PC8hYj4gaXRhbGljPC9pPjwvYj4KPG9iZj5hYmM8L29iZj4gb2JmdXNjYXRlZCA8b2JmPmRlZjwvb2JmPgoKPGdyYWRpZW50OnJlZDpibHVlPnJlZCB0byBibHVlPC9ncmFkaWVudD4KPGdyYWRpZW50OmFxdWE6Z3JlZW4+YXF1YSB0byBncmVlbjwvZ3JhZGllbnQ+CjxncmFkaWVudDpyZWQ6Z29sZDphcXVhOmJsdWU6bGlnaHRfcHVycGxlPnJhaW5ib3cgYXQgaG9tZTwvZ3JhZGllbnQ+CjxncmFkaWVudDojRkY5RkIzOiNGREFERjg6I0FBOTNGRjojOUNDMkZEOiNBMUZCRkY6IzhERkZDQzojQThGRkE3OiNEREZGQTU6MC4wPmN1c3RvbSBjb2xvcnMhPC9ncmFkaWVudD4=`);
        update();
         */
    });
})(window);
