import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

//

export default defineConfig({
    build: {
        target: "esnext",
        rolldownOptions: {
            resolve: {
                aliasFields: [[]]
            }
        }
    },
    plugins: [
        tailwindcss(),
        glsl({
            minify: true,
        }),
    ],
});
