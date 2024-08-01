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
        entry: "./src/index.ts",
        mode, devtool,
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: "ts-loader",
                    exclude: /node_modules|dist|tests|types/
                }
            ]
        },
        resolve: {
            extensions: [".tsx", ".ts"]
        },
        output: {
            path: path.resolve(__dirname, "umd"),
            filename: "minimessage-fetch-translations" + ext,
            globalObject: "this",
            library: {
                name: "MiniMessageTranslations",
                type: "umd"
            }
        }
    };
});