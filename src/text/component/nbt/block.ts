import {AbstractNBTComponent, NBTComponent} from "../nbt";
import type {Component} from "../../component";
import {Style} from "../../style";
import {defineAccessor} from "../../../util/accessor";

//

export namespace BlockNBTComponent {

    export const TYPE = "blockNBT";

    export interface LocalPos {

        readonly type: "local";

        left(): number;

        up(): number;

        forwards(): number;

        asString(): string;

        toString(): string;

    }

    export namespace LocalPos {

        export function localPos(left: number, up: number, forwards: number): LocalPos {
            return Object.freeze({
                type: "local",
                left() {
                    return left;
                },
                up() {
                    return up;
                },
                forwards() {
                    return forwards;
                },
                asString(): string {
                    return `^${left} ^${up} ^${forwards}`;
                },
                toString(): string {
                    return this.asString();
                }
            });
        }

    }

    export interface WorldPos {

        readonly type: "world";

        x(): WorldPos.Coordinate;

        y(): WorldPos.Coordinate;

        z(): WorldPos.Coordinate;

        asString(): string;

        toString(): string;

    }

    export namespace WorldPos {

        export function worldPos(
            x: Coordinate,
            y: Coordinate,
            z: Coordinate
        ): WorldPos {
            return Object.freeze({
                type: "world",
                x() {
                    return x;
                },
                y() {
                    return y;
                },
                z() {
                    return z;
                },
                asString(): string {
                    return `${x.toString()} ${y.toString()} ${z.toString()}`;
                },
                toString(): string {
                    return this.asString()
                }
            });
        }

        export interface Coordinate {

            type(): "absolute" | "relative";

            value(): number;

            toString(): string;

        }

        export namespace Coordinate {

            export function coordinate(
                value: number,
                type: "absolute" | "relative"
            ): Coordinate {
                return Object.freeze({
                    type() {
                        return type;
                    },
                    value() {
                        return value;
                    },
                    toString(): string {
                        return type === "absolute" ?
                            `${value}` : `~${value}`;
                    }
                });
            }

            export function absolute(value: number) {
                return coordinate(value, "absolute");
            }

            export function relative(value: number) {
                return coordinate(value, "relative");
            }

        }

    }

    export type Pos = LocalPos | WorldPos;

    export namespace Pos {

        export function fromString(input: string): Pos {
            const localMatch = /^\^([\d.]+)\x20\^([\d.]+)\x20\^([\d.]+)$/.exec(input);
            if (localMatch) {
                const a = parseFloat(localMatch[1]);
                const b = parseFloat(localMatch[2]);
                const c = parseFloat(localMatch[3]);
                if (!isNaN(a) && !isNaN(b) && !isNaN(c)) {
                    return LocalPos.localPos(a, b, c);
                }
            }

            const worldMatch = /^(~?)(\d+)\x20(~?)(\d+)\x20(~?)(\d+)$/.exec(input);
            if (worldMatch) {
                const ai = parseInt(worldMatch[2]);
                const bi = parseInt(worldMatch[4]);
                const ci = parseInt(worldMatch[6]);
                if (!isNaN(ai) && !isNaN(bi) && !isNaN(ci)) {
                    const a = WorldPos.Coordinate.coordinate(ai, !!worldMatch[1] ? "relative" : "absolute");
                    const b = WorldPos.Coordinate.coordinate(bi, !!worldMatch[3] ? "relative" : "absolute");
                    const c = WorldPos.Coordinate.coordinate(ci, !!worldMatch[5] ? "relative" : "absolute");
                    return WorldPos.worldPos(a, b, c);
                }
            }

            throw new Error(`Cannot convert position specification "${input}" into a position`);
        }

    }

}

export interface BlockNBTComponent extends NBTComponent<BlockNBTComponent> {

    readonly type: typeof BlockNBTComponent.TYPE;

    pos(): BlockNBTComponent.Pos;

    pos(pos: BlockNBTComponent.Pos): BlockNBTComponent;

}

//

type Extra = {
    pos: BlockNBTComponent.Pos,
    nbtPath: string,
    interpret: boolean,
    separator: Component | null
};

/** @internal */
export class BlockNBTComponentImpl extends AbstractNBTComponent<BlockNBTComponentImpl, Extra> implements BlockNBTComponent {

    readonly type = BlockNBTComponent.TYPE;

    constructor(extra: Extra, children?: Component[], style?: Style) {
        super(extra, children, style);
    }

    //

    pos = defineAccessor(
        () => this._getExtra("pos"),
        (pos) => this._withExtra("pos", pos)
    );

    protected _mutate(extra: Extra, children: Component[], style: Style): BlockNBTComponentImpl {
        return new BlockNBTComponentImpl(extra, children, style);
    }

}
