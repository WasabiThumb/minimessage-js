import {TextDecoration} from "../../../text/style/decoration";
import {TagResolver} from "../resolver";
import {ArgumentQueue} from "../resolver/argumentQueue";
import {Tag} from "../../tag";

export namespace DecorationTag {

    const B = "b";
    const I = "i";
    const EM = "em";
    const OBF = "obf";
    const ST = "st";
    const U = "u";

    export const REVERT = "!";

    //

    function create(decoration: TextDecoration, args: ArgumentQueue): Tag {
        const flag = !args.hasNext() || !args.pop().isFalse();
        return Tag.styling((style) => {
            style.decoration(decoration, flag);
        });
    }

    function createNegated(decoration: TextDecoration): Tag {
        return Tag.styling((style) => {
            style.decoration(decoration, TextDecoration.State.FALSE);
        });
    }

    type Resolvers = {
        decoration: TextDecoration,
        resolvers: TagResolver[]
    };

    function resolvers(decoration: TextDecoration, ...aliases: string[]): Resolvers {
        const names = new Set<string>();
        names.add(decoration);
        for (const alias of aliases) names.add(alias);

        const count = names.size;
        const resolvers: TagResolver[] = new Array(count * 2);
        let head: number = 0;

        for (const name of names) {
            resolvers[head++] = TagResolver.dynamic(name, (args) => create(decoration, args));
            resolvers[head++] = TagResolver.resolver(`${REVERT}${name}`, createNegated(decoration));
        }

        return { decoration, resolvers };
    }

    //

    export const RESOLVERS = ((stream: Resolvers[]) => {
        let ret: { [D in TextDecoration]?: TagResolver } = {};
        for (const resolvers of stream) {
            ret[resolvers.decoration] = TagResolver.builder()
                .resolvers(...resolvers.resolvers)
                .build();
        }
        return Object.freeze(ret as Record<TextDecoration, TagResolver>);
    })([
        resolvers(TextDecoration.OBFUSCATED, OBF),
        resolvers(TextDecoration.BOLD, B),
        resolvers(TextDecoration.STRIKETHROUGH, ST),
        resolvers(TextDecoration.UNDERLINED, U),
        resolvers(TextDecoration.ITALIC, EM, I),
    ]);

    export const RESOLVER = TagResolver.builder()
        .resolvers(...Object.values(RESOLVERS))
        .build();

}
