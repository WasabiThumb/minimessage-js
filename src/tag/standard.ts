import {TagResolver} from "./spec";
import {ClickEventTagResolver} from "./impl/clickEvent";
import {ColorTagResolver} from "./impl/color";
import {DecorationTagResolver} from "./impl/decoration";
import {ComponentDecoration} from "../component/spec";
import {FontTagResolver} from "./impl/font";
import {GradientTagResolver} from "./impl/gradient";
import {HoverEventTagResolver} from "./impl/hoverEvent";
import {InsertionTagResolver} from "./impl/insertion";
import {KeybindTagResolver} from "./impl/keybind";
import {NewlineTagResolver} from "./impl/newline";
import {RainbowTagResolver} from "./impl/rainbow";
import {ResetTagResolver} from "./impl/reset";
import {ScoreTagResolver} from "./impl/score";
import {SelectorTagResolver} from "./impl/selector";
import {TransitionTagResolver} from "./impl/transition";
import {TranslatableTagResolver} from "./impl/translatable";

/**
 * Factory for tag resolvers included with MiniMessage. ``defaults()`` contains all tags that can be parsed and written
 * to HTML without data loss, ``all()`` contains all tags that are implemented within this package. This entails (at
 * the time of writing) everything except NBT and translatableFallback.
 */
export const StandardTags = new class {

    clickEvent(): TagResolver {
        return ClickEventTagResolver.INSTANCE;
    }

    color(): TagResolver {
        return ColorTagResolver.INSTANCE;
    }

    decorations(decoration?: ComponentDecoration): TagResolver {
        if (typeof decoration !== "undefined") return DecorationTagResolver.of(decoration);
        return DecorationTagResolver.INSTANCE;
    }

    font(): TagResolver {
        return FontTagResolver.INSTANCE;
    }

    gradient(): TagResolver {
        return GradientTagResolver.INSTANCE;
    }

    hoverEvent(): TagResolver {
        return HoverEventTagResolver.INSTANCE;
    }

    insertion(): TagResolver {
        return InsertionTagResolver.INSTANCE;
    }

    keybind(): TagResolver {
        return KeybindTagResolver.INSTANCE;
    }

    nbt(): TagResolver {
        throw new Error("Not implemented");
        // TODO
    }

    newline(): TagResolver {
        return NewlineTagResolver.INSTANCE;
    }

    rainbow(): TagResolver {
        return RainbowTagResolver.INSTANCE;
    }

    reset(): TagResolver {
        return ResetTagResolver.INSTANCE;
    }

    score(): TagResolver {
        return ScoreTagResolver.INSTANCE;
    }

    selector(): TagResolver {
        return SelectorTagResolver.INSTANCE;
    }

    transition(): TagResolver {
        return TransitionTagResolver.INSTANCE;
    }

    translatable(): TagResolver {
        return TranslatableTagResolver.INSTANCE;
    }

    //

    builder(): TagResolver.Builder {
        return TagResolver.builder();
    }

    all(): TagResolver {
        return this.builder()
            .resolvers(
                this.clickEvent(),
                this.color(),
                this.decorations(),
                this.font(),
                this.gradient(),
                this.hoverEvent(),
                this.insertion(),
                this.keybind(),
                // nbt is TODO
                this.newline(),
                this.rainbow(),
                this.reset(),
                this.score(),
                this.selector(),
                this.transition(),
                this.translatable()
                // translatableFallback is TODO
            )
            .build();
    }

    defaults(): TagResolver {
        return this.builder()
            .resolvers(
                this.clickEvent(),
                this.color(),
                this.decorations(),
                // font is excluded because we can't currently HTML-ify that info
                this.gradient(),
                this.hoverEvent(),
                this.insertion(),
                // keybind is excluded because we can't currently HTML-ify that info
                // nbt is TODO
                this.newline(),
                this.rainbow(),
                this.reset(),
                // score is excluded because we can't currently HTML-ify that info
                // selector is excluded because we can't currently HTML-ify that info
                this.transition(),
                // translatable is excluded because we can't currently HTML-ify that info
                // translatableFallback is TODO
            )
            .build();
    }

};

export type StandardTagsT = typeof StandardTags;
