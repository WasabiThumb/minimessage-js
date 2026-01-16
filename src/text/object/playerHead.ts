import {ArrayUtil} from "../../util/array";

export interface PlayerHeadObjectContents {

    readonly type: "playerHead";

    name(): string | null;

    id(): string | null;

    profileProperties(): PlayerHeadObjectContents.ProfileProperty[],

    hat(): boolean,

    texture(): string | null

}

export namespace PlayerHeadObjectContents {

    /** @internal */
    function newContents(
        name: string | null,
        id: string | null,
        profileProperties: ProfileProperty[],
        hat: boolean,
        texture: string | null
    ): PlayerHeadObjectContents {
        return Object.freeze({
            type: "playerHead",
            name() {
                return name;
            },
            id() {
                return id;
            },
            profileProperties() {
                return ArrayUtil.immutableView(profileProperties);
            },
            hat() {
                return hat;
            },
            texture() {
                return texture;
            }
        });
    }

    export function property(
        name: string,
        value: string,
        signature: string | null = null
    ): ProfileProperty {
        return Object.freeze({
            name() {
                return name;
            },
            value() {
                return value;
            },
            signature() {
                return signature;
            }
        });
    }

    export interface ProfileProperty {

        name(): string;

        value(): string;

        signature(): string | null;

    }

    export interface Builder {

        name(name: string | null): Builder;

        id(id: string | null): Builder;

        profileProperty(property: ProfileProperty): Builder;

        profileProperties(properties: ProfileProperty[]): Builder;

        hat(hat: boolean): Builder;

        texture(texture: string | null): Builder;

        build(): PlayerHeadObjectContents;

    }

    /** @internal */
    class BuilderImpl implements Builder {

        private _name: string | null = null;
        private _id: string | null = null;
        private _properties: Record<string, ProfileProperty> = {};
        private _hat: boolean = true;
        private _texture: string | null = null;

        //

        name(name: string | null): Builder {
            this._name = name;
            return this;
        }

        id(id: string | null): Builder {
            this._id = id;
            return this;
        }

        profileProperty(property: ProfileProperty): Builder {
            this._properties[property.name()] = property;
            return this;
        }

        profileProperties(properties: ProfileProperty[]): Builder {
            this._properties = {};
            for (let property of properties) this._properties[property.name()] = property;
            return this;
        }

        hat(hat: boolean): Builder {
            this._hat = hat;
            return this;
        }

        texture(texture: string | null): Builder {
            this._texture = texture;
            return this;
        }

        build(): PlayerHeadObjectContents {
            const propKeys = Object.keys(this._properties);
            const propValues: ProfileProperty[] = new Array(propKeys.length);
            for (let i = 0; i < propKeys.length; i++) {
                propValues[i] = this._properties[propKeys[i]];
            }

            return newContents(
                this._name,
                this._id,
                propValues,
                this._hat,
                this._texture
            );
        }

    }

    export function builder(): Builder {
        return new BuilderImpl();
    }

}
