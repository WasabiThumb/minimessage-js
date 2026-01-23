
export class AddButton {

    private readonly _element: HTMLElement;

    constructor(element: HTMLElement) {
        this._element = element;
    }

    //

    bind(callback: (state: boolean) => void) {
        let state: boolean = false;
        this._element.addEventListener("click", () => {
            state = !state;
            if (state) {
                this._element.setAttribute("data-active", "");
            } else {
                this._element.removeAttribute("data-active");
            }
            callback(state);
        });
    }

}
