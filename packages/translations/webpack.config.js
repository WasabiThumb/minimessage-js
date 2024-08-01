const path = require("path");

module.exports = ((env) => {
    let mode = "production";
    let devtool = false;
    let ext = ".min.js";

    if ("mode" in env && env["mode"] === "dev") {
        mode = "development";
        devtool = "inline-source-map";
        ext = ".js";
    }

    return {
        entry: "./src/index.js",
        mode, devtool,
        resolve: {
            fallback: {
                "fs": false,
                "fs/promises": false,
                "path": false
            }
        },
        output: {
            path: path.resolve(__dirname, "umd"),
            filename: "minimessage-translations" + ext,
            globalObject: "this",
            library: {
                name: "MiniMessageTranslations",
                type: "umd"
            }
        }
    };
});