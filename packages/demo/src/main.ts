import './main.css';
import {Listing} from "./lib/listing.ts";
import {Operation} from "./lib/operation.ts";
import {Output} from "./lib/output.ts";
import {Colors} from "./lib/colors.ts";
import {Dropdown} from "./lib/dropdown.ts";
import {AddButton} from "./lib/add.ts";

//

const IDB_LISTING = "listing";

function setupListing(listing: Listing) {
    // Save future changes to the listing
    listing.onUpdate(() => {
        localStorage.setItem(IDB_LISTING, JSON.stringify(listing.write()));
    });

    // Load listing from previous session(s)
    const saved = localStorage.getItem(IDB_LISTING);
    if (saved) {
        try {
            listing.read(JSON.parse(saved));
            return;
        } catch (e) {
            console.warn("Failed to load saved listing", e);
        }
    }

    // Fallback to a default welcomer
    const value = `<head:entity/player/wide/steve> I <b>love</b> <rainbow>MiniMessage</rainbow>!`;
    listing.add(Operation.get("literalString"), { value });
    listing.add(Operation.get("miniDeserialize"));
    listing.add(Operation.get("domRender"));
}

//

(() => {
    // Bind the colors component
    const colorsElement = document.querySelector<HTMLElement>(`#colors`);
    if (!colorsElement) return;
    const colors = new Colors(colorsElement);

    // Bind the listing component
    const operationsElement = document.querySelector<HTMLElement>("#operations");
    if (!operationsElement) return;
    const listingElement = operationsElement.querySelector<HTMLElement>(`[data-role="listing"]`);
    if (!listingElement) return;
    const listing = new Listing(listingElement, colors);
    setupListing(listing);

    // Bind the output component
    const outputElement = document.querySelector<HTMLElement>("#output");
    if (!outputElement) return;
    const output = new Output(outputElement);
    listing.onUpdate((listing) => {
        output.update(listing.resolve());
    });
    output.update(listing.resolve());

    // Bind the dropdown element
    const dropdownElement = document.querySelector<HTMLElement>(`#dropdown`);
    if (!dropdownElement) return;
    const dropdown = new Dropdown(dropdownElement, listing);

    // Bind the add button
    const addButton = document.querySelector<HTMLElement>(`#add`);
    if (!addButton) return;
    const add = new AddButton(addButton);
    add.bind((e) => {
        dropdown.visible = e;
    });
})();
