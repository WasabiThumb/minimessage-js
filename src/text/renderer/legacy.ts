import {AbstractComponentRenderer} from "../renderer";
import {Component} from "../component";
import {NamedTextColor, TextColor} from "../style/textColor";
import {ShadowColor, Style} from "../style";

//

const truncateColor = (() => {
    const NAMED: NamedTextColor[] = Object.values(NamedTextColor.NAMES);

    const distance = ((a: TextColor, b: TextColor) => {
        let dist: number = 0;
        const sum = ((component: "red" | "green" | "blue") => {
            const difference = a[component]() - b[component]();
            dist += difference * difference;
        });

        sum("red");
        sum("green");
        sum("blue");

        return dist;
    });

    return ((color: TextColor) => {
        if (NamedTextColor.isNamed(color)) return color as NamedTextColor;

        let closest: NamedTextColor = NAMED[0];
        let closestDist: number = distance(color, closest);

        for (let i = 1; i < NAMED.length; i++) {
            const next = NAMED[i];
            const dist = distance(color, next);
            if (dist < closestDist) {
                closest = next;
                closestDist = dist;
            }
        }

        return closest;
    });
})();

//

export class LegacyColorComponentRenderer extends AbstractComponentRenderer<any> {

    private static readonly INSTANCE = new LegacyColorComponentRenderer();

    static renderer(): LegacyColorComponentRenderer {
        return this.INSTANCE;
    }

    //

    render(component: Component): Component {
        return super.render(component, null);
    }

    protected renderBlock = this._renderComponent;
    protected renderEntity = this._renderComponent;
    protected renderKeybind = this._renderComponent;
    protected renderObject = this._renderComponent;
    protected renderScore = this._renderComponent;
    protected renderSelector = this._renderComponent;
    protected renderStorage = this._renderComponent;
    protected renderText = this._renderComponent;
    protected renderTranslatable = this._renderComponent;

    //

    private _renderComponent(component: Component): Component {
        let style: Style = component.style();
        let children: Component[] = component.children();
        let changed: boolean = false;
        let copiedChildren: boolean = false;

        const color = style.color();
        if (color !== null) {
            style = style.color(truncateColor(color));
            changed = true;
        }

        const shadowColor = style.shadowColor();
        if (shadowColor !== null) {
            let value: number = shadowColor.value();
            let textColor = TextColor.color(value & 0x00FFFFFF);
            textColor = truncateColor(textColor);
            value = textColor.value() | (value & 0xFF000000);
            style = style.shadowColor(ShadowColor.shadowColor(value));
            changed = true;
        }

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const renderedChild = this.render(child);
            if (!changed && child === renderedChild) continue;
            if (!copiedChildren) {
                children = [...children];
                copiedChildren = true;
            }
            children[i] = renderedChild;
            changed = true;
        }

        return changed ?
            component.style(style).children(children) :
            component;
    }

}
