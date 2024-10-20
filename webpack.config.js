const path = require("path");

module.exports = {
    entry: "./src/index.ts",
    target: "node",
    mode: "production",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.js",
    },
    module: {
        rules: [
            {
                resourceQuery: /raw/,
                type: "asset/source",
            },
        ],
    },
};