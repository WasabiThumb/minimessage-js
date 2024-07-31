import {Component} from "../component/spec";

export interface TagResolverContext {

    deserialize(miniMessage: string): Component;

}
