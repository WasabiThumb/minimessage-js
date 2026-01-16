
export type JsonClickEvent = JsonClickEvent.OpenUrl |
    JsonClickEvent.OpenFile |
    JsonClickEvent.RunCommand |
    JsonClickEvent.SuggestCommand |
    JsonClickEvent.ChangePage |
    JsonClickEvent.CopyToClipboard |
    JsonClickEvent.ShowDialog |
    JsonClickEvent.Custom;

export namespace JsonClickEvent {

    export type OpenUrl = {
        action: "open_url",
        url: string
    };

    export type OpenFile = {
        action: "open_file",
        path: string
    };

    export type RunCommand = {
        action: "run_command",
        command: string
    };

    export type SuggestCommand = {
        action: "suggest_command",
        command: string
    };

    export type ChangePage = {
        action: "change_page",
        page: number
    };

    export type CopyToClipboard = {
        action: "copy_to_clipboard",
        value: string
    };

    export type ShowDialog = {
        action: "show_dialog",
        dialog: unknown
    };

    export type Custom = {
        action: "custom",
        id: string,
        payload?: string
    };

}

//

export type JsonHoverEvent = JsonHoverEvent.ShowText |
    JsonHoverEvent.ShowItem |
    JsonHoverEvent.ShowEntity;

export namespace JsonHoverEvent {

    export type ShowText = {
        action: "show_text",
        value: JsonComponent
    };

    export type ShowItem = {
        action: "show_item",
        id: string,
        count?: number,
        components?: unknown
    };

    export type ShowEntity = {
        action: "show_entity",
        id: string,
        uuid: string | [ number, number, number, number ]
        name?: JsonComponent
    };

}

//

export type JsonPlayerProfileProperty = {
    name: string,
    value: string,
    signature?: string
};

export type JsonPlayerProfile = {
    name?: string,
    id?: [ number, number, number, number ],
    texture?: string,
    cape?: string,
    model?: "wide" | "slim",
    properties?: JsonPlayerProfileProperty[];
};

//

export type JsonComponent = JsonTextComponent |
    JsonTranslatableComponent |
    JsonScoreboardComponent |
    JsonSelectorComponent |
    JsonKeybindComponent |
    JsonBlockNBTComponent |
    JsonEntityNBTComponent |
    JsonStorageNBTComponent |
    JsonAtlasObjectComponent |
    JsonPlayerObjectComponent;

export type JsonComponentKeyValues = Partial<
    Exclude<JsonTextComponent, string> &
    JsonTranslatableComponent &
    JsonScoreboardComponent &
    JsonSelectorComponent &
    JsonKeybindComponent &
    JsonBlockNBTComponent &
    JsonEntityNBTComponent &
    JsonStorageNBTComponent &
    JsonAtlasObjectComponent &
    JsonPlayerObjectComponent
>;

export type JsonBaseComponent = {
    extra?: JsonComponent[],
    color?: string,
    font?: string,
    bold?: boolean,
    italic?: boolean,
    underlined?: boolean,
    strikethrough?: boolean,
    obfuscated?: boolean,
    shadow_color?: number | [ number, number, number, number ],
    insertion?: string,
    click_event?: JsonClickEvent,
    hover_event?: JsonHoverEvent
};

export type JsonTextComponent = string | (JsonBaseComponent & {
    type?: "text",
    text: string
});

export type JsonTranslatableComponent = JsonBaseComponent & {
    type?: "translatable",
    translate: string,
    fallback?: string,
    with?: JsonComponent[]
};

export type JsonScoreboardComponent = JsonBaseComponent & {
    type?: "score",
    score: {
        name: string,
        objective: string
    }
};

export type JsonSelectorComponent = JsonBaseComponent & {
    type?: "selector",
    selector: string,
    separator?: JsonComponent
};

export type JsonKeybindComponent = JsonBaseComponent & {
    type?: "keybind",
    keybind: string
};

export type JsonBlockNBTComponent = JsonBaseComponent & {
    type?: "nbt",
    source?: "block",
    nbt: string,
    interpret?: boolean,
    separator?: JsonComponent,
    block: string
};

export type JsonEntityNBTComponent = JsonBaseComponent & {
    type?: "nbt",
    source?: "entity",
    nbt: string,
    interpret?: boolean,
    separator?: JsonComponent,
    entity: string
};

export type JsonStorageNBTComponent = JsonBaseComponent & {
    type?: "nbt",
    source?: "storage",
    nbt: string,
    interpret?: boolean,
    separator?: JsonComponent,
    storage: string
};

export type JsonAtlasObjectComponent = JsonBaseComponent & {
    type?: "object",
    object?: "atlas",
    atlas?: string,
    sprite: string
};

export type JsonPlayerObjectComponent = JsonBaseComponent & {
    type?: object,
    object?: "player",
    player: JsonPlayerProfile | string,
    hat?: boolean
};
