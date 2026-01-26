import {UUID} from "../../../util/uuid";
import {SharedCanvas} from "./canvas";

//

/** @internal */
export namespace OnlineHeads {

    const workspace = new SharedCanvas(8, 8);

    //

    function extractTextures(profile: any): string | null {
        if (profile === null) return null;
        if (typeof profile !== "object") return null;
        if (!("properties" in profile)) return null;
        const properties: any = profile["properties"];
        if (!Array.isArray(properties)) return null;
        for (const property of properties as any[]) {
            if (property === null) continue;
            if (typeof property !== "object") continue;
            if (!("name" in property)) continue;
            if ("textures" !== property["name"]) continue;
            if (!("value" in property)) continue;
            return `${property["value"]}`;
        }
        return null;
    }

    function upgradeHTTP(url: string): string {
        // The texture link provided by the mojang API is http
        // despite also supporting https. Browsers
        // consistently block this request instead of upgrading
        // it, so we do this manually.
        if (!url.startsWith("http:")) return url;
        return "https:" + url.substring(5);
    }

    /**
     * Provides an object URL containing the
     * face texture of the given online user, with or without
     * the hat layer.
     */
    export async function get(id: UUID, hat: boolean): Promise<string | null> {
        const url = `https://corsjangsessionserver.b-cdn.net/session/minecraft/profile/${id.toString(true)}`;
        const response = await fetch(url, { cache: "force-cache" });
        if (response.status !== 200) return null;

        const json = await response.json();
        const texturesData = extractTextures(json);
        if (texturesData === null) return null;

        const texturesContainer = JSON.parse(atob(texturesData)) as { textures?: { SKIN?: { url: string } } };
        const textures = texturesContainer["textures"];
        if (!textures) return null;
        const skin = textures["SKIN"];
        if (!skin) return null;

        let skinUrl = skin.url;
        skinUrl = upgradeHTTP(skinUrl);

        const bitmap = await fetch(skinUrl, { cache: "force-cache" })
            .then((r) => r.blob())
            .then((blob) => createImageBitmap(blob));

        const face = await workspace.use((canvas, context) => {
            // Disable smoothing
            context.imageSmoothingEnabled = false;

            // Draw the base layer
            context.globalCompositeOperation = "copy";
            context.drawImage(
                bitmap,
                8, 8,
                8, 8,
                0, 0,
                8, 8
            );

            // Draw the hat layer
            if (hat) {
                context.globalCompositeOperation = "source-over";
                context.drawImage(
                    bitmap,
                    40, 8,
                    8, 8,
                    0, 0,
                    8, 8
                );
            }

            // Convert to blob
            return canvas.convertToBlob({ type: "image/bmp" });
        });

        return URL.createObjectURL(face);
    }

    /**
     * Looks up an online user by their name.
     */
    export async function lookup(name: string): Promise<UUID | null> {
        const url = `https://corsjangservices.b-cdn.net/minecraft/profile/lookup/name/${name}`;
        const response = await fetch(url, { cache: "force-cache" });
        if (response.status !== 200) return null;

        const json = await response.json();
        if (typeof json === "object" && json !== null && "id" in json) return UUID.fromString(`${json["id"]}`);
        throw new Error(`Unexpected response payload (${json})`);
    }

}
