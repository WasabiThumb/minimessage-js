import {TagResolver} from "./tag/resolver";
import {ContextImpl} from "./context";
import {StringBuilder} from "../util/string";
import {Token, TokenType} from "./token";
import {TokenParser} from "./token/parser";
import {Character} from "../util/char";
import {RootNode} from "./tree/root";
import {Tag} from "./tag";
import {ArgumentQueueImpl} from "./tag/resolver/argumentQueue";
import {ErrorInfo} from "../util/errors";
import {ElementNode} from "./tree/element";
import {Component} from "../text/component";
import {ValueNode} from "./tree/value";
import {TagNode} from "./tree/tag";

//

type EscapeTokensFn = {
    (context: ContextImpl): string;
    (sb: StringBuilder, context: ContextImpl): void;
};

//

/** @internal */
export class MiniMessageParser {

    constructor(
        readonly tagResolver: TagResolver
    ) { }

    //

    escapeTokens(ctx: ContextImpl): string {
        const message = ctx.message();
        const sb = new StringBuilder(message.length);
        this._escapeTokens(sb, message, ctx);
        return sb.toString();
    }

    private _escapeTokens(sb: StringBuilder, richMessage: string, context: ContextImpl): void {
        this._processTokens(sb, richMessage, context, (token, sb) => {
            sb.appendChar(Character.BACKSLASH);
            sb.appendChar(TokenParser.TAG_START);
            if (token.type() === TokenType.CLOSE_TAG) {
                sb.appendChar(TokenParser.CLOSE_TAG);
            }
            const childTokens = token.childTokens();
            if (childTokens !== null) {
                for (let i = 0; i < childTokens.length; i++) {
                    if (i) sb.appendChar(TokenParser.SEPARATOR);
                    this._escapeTokens(sb, childTokens[i].get(richMessage), context);
                }
            }
            sb.appendChar(TokenParser.TAG_END);
        });
    }

    stripTokens(ctx: ContextImpl): string {
        const message = ctx.message();
        const sb = new StringBuilder(message.length);
        this._processTokens(sb, message, ctx, () => {});
        return sb.toString();
    }

    private _processTokens(
        sb: StringBuilder,
        richMessage: string,
        context: ContextImpl,
        tagHandler: (token: Token, sb: StringBuilder) => void
    ): void {
        const combinedResolver = TagResolver.builder()
            .resolver(this.tagResolver)
            .resolver(context.extraTags())
            .build();

        const root = TokenParser.tokenize(richMessage, true);
        for (const token of root) {
            // noinspection FallThroughInSwitchStatementJS
            switch (token.type()) {
                case TokenType.OPEN_TAG:
                case TokenType.CLOSE_TAG:
                case TokenType.OPEN_CLOSE_TAG:
                    const childTokens = token.childTokens();
                    if (childTokens !== null && childTokens.length !== 0) {
                        const sanitized = TokenParser.TagProvider.sanitizePlaceholderName(childTokens[0].get(richMessage));
                        if (combinedResolver.has(sanitized)) {
                            tagHandler(token, sb);
                            break;
                        }
                    }
                case TokenType.TEXT:
                    sb.appendString(richMessage, token.startIndex(), token.endIndex());
                    break;
                default:
                    throw new Error(`Unsupported token type ${String(token.type())}`);
            }
        }
    }

    parseToTree(context: ContextImpl): RootNode {
        const combinedResolver = TagResolver.builder()
            .resolver(this.tagResolver)
            .resolver(context.extraTags())
            .build();

        const preprocessor = context.preProcessor();
        const processedMessage = preprocessor(context.message());
        const debug = context.debugOutput();

        // noinspection SuspiciousTypeOfGuard
        if (typeof processedMessage !== "string") {
            throw context.newException(`Preprocessor gave a non-string value (${processedMessage})`);
        }

        if (debug) {
            debug("Beginning parsing message");
            debug(processedMessage);
            debug("\n");
        }

        let transformationFactory: TokenParser.TagProvider;
        if (debug) {
            transformationFactory = this._newTagProvider((name, trimmedArgs, token) => {
                try {
                    debug("Attempting to match node '");
                    debug(name);
                    debug("'");
                    if (token !== null) {
                        debug(" at column ");
                        debug(`${token.startIndex()}`);
                    }
                    debug("\n");

                    const transformation = combinedResolver.resolve(
                        name,
                        new ArgumentQueueImpl(context, trimmedArgs),
                        context
                    );

                    if (transformation === null) {
                        debug("Could not match node '");
                        debug(name);
                        debug("'\n");
                    } else {
                        debug("Successfully matched node '");
                        debug(name);
                        debug("' to tag ");
                        debug(transformation.type);
                        debug("\n");
                    }

                    return transformation!;
                } catch (e) {
                    debug("Could not match node '");
                    debug(name);
                    debug("' - ");
                    debug(ErrorInfo.of(e).message);
                    debug("\n");
                    return null;
                }
            });
        } else {
            transformationFactory = this._newTagProvider((name, args) => {
                try {
                    return combinedResolver.resolve(name, new ArgumentQueueImpl(context, args), context);
                } catch (ignored) {
                    return null;
                }
            });
        }

        const tagNameChecker = ((name: string) => {
            const sanitized = TokenParser.TagProvider.sanitizePlaceholderName(name);
            return combinedResolver.has(sanitized);
        });

        const preProcessed = TokenParser.resolvePreProcessTags(processedMessage, transformationFactory);
        context.message(preProcessed);

        // Real parse
        const root = TokenParser.parse(
            transformationFactory,
            tagNameChecker,
            preProcessed,
            processedMessage,
            context.strict()
        );

        if (debug) {
            debug("Text parsed into element tree:\n");
            debug(root.toString());
        }

        return root;
    }

    private _newTagProvider(resolve: TokenParser.TagProvider["resolve"]): TokenParser.TagProvider {
        return { resolve };
    }

    parseFormat(context: ContextImpl): Component {
        const root = this.parseToTree(context);
        let component: Component = this.treeToComponent(root, context);

        const postProcessor = context.postProcessor();
        component = postProcessor(component);
        if (!Component.isComponent(component))
            throw new Error(`Post-processor gave a non-Component value (${component})`);

        return component;
    }

    treeToComponent(node: ElementNode, context: ContextImpl): Component {
        let comp: Component = Component.empty();
        let tag: Tag | null = null;

        if (node instanceof ValueNode) {
            comp = Component.text(node.value());
        } else if (node instanceof TagNode) {
            tag = node.tag();

            if (tag.type === "modifying") {
                this._visitModifying(tag, node, 0);
                tag.postVisit();
            } else if (tag.type === "inserting") {
                comp = tag.value();
            }
        }

        const unsafeChildren = node.unsafeChildren();
        if (unsafeChildren.length !== 0) {
            const existingChildren = comp.children();
            const children: Component[] = new Array(existingChildren.length + unsafeChildren.length);
            let head: number = 0;

            for (const child of existingChildren) {
                children[head++] = child;
            }

            for (const child of unsafeChildren) {
                children[head++] = this.treeToComponent(child, context);
            }

            children.length = head;
            comp = comp.children(children);
        }

        if (tag !== null && tag.type === "modifying") {
            comp = this._handleModifying(tag, comp, 0);
        }

        const debug = context.debugOutput();
        if (debug) {
            debug("==========\ntreeToComponent \n");
            debug(`${node}`);
            debug("\n");
            debug(`${comp}`);
            debug("\n==========\n");
        }

        return comp;
    }

    private _visitModifying(modTransformation: Tag.Modifying, node: ElementNode, depth: number): void {
        modTransformation.visit(node, depth);
        for (const child of node.unsafeChildren()) {
            this._visitModifying(modTransformation, child, depth + 1);
        }
    }

    private _handleModifying(modTransformation: Tag.Modifying, current: Component, depth: number): Component {
        let newComp: Component = modTransformation.apply(current, depth);
        for (const child of current.children()) {
            newComp = newComp.append(this._handleModifying(modTransformation, child, depth + 1));
        }
        return newComp;
    }

}
