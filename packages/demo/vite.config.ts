import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
    plugins: [
        tailwindcss(),
        glsl({
            minify: true,
        }),
    ],
});
