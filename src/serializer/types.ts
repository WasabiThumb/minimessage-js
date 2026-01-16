import { Component } from "../text/component";

//

export interface ComponentSerializer<I extends Component, O extends Component, R> {

    serialize(component: I): R;

    deserialize(input: R): O;

}
