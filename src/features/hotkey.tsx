import { hasWon } from "data/projEntry";
import type { OptionsFunc, Replace } from "features/feature";
import { findFeatures, jsx, setDefault } from "features/feature";
import { globalBus } from "game/events";
import player from "game/player";
import { registerInfoComponent } from "game/settings";
import type {
    Computable,
    GetComputableType,
    GetComputableTypeWithDefault,
    ProcessedComputable
} from "util/computed";
import { processComputable } from "util/computed";
import { createLazyProxy } from "util/proxies";
import { shallowReactive, unref } from "vue";
import Hotkey from "components/Hotkey.vue";

/** A dictionary of all hotkeys. */
export const hotkeys: Record<string, GenericHotkey | undefined> = shallowReactive({});
/** A symbol used to identify {@link Hotkey} features. */
export const HotkeyType = Symbol("Hotkey");

/**
 * An object that configures a {@link Hotkey}.
 */
export interface HotkeyOptions {
    /** Whether or not this hotkey is currently enabled. */
    enabled?: Computable<boolean>;
    /** The key tied to this hotkey */
    key: string;
    /** The description of this hotkey, to display in the settings. */
    description: Computable<string>;
    /** What to do upon pressing the key. */
    onPress: VoidFunction;
}

/**
 * The properties that are added onto a processed {@link HotkeyOptions} to create an {@link Hotkey}.
 */
export interface BaseHotkey {
    /** A symbol that helps identify features of the same type. */
    type: typeof HotkeyType;
}

/** An object that represents a hotkey shortcut that performs an action upon a key sequence being pressed. */
export type Hotkey<T extends HotkeyOptions> = Replace<
    T & BaseHotkey,
    {
        enabled: GetComputableTypeWithDefault<T["enabled"], true>;
        description: GetComputableType<T["description"]>;
    }
>;

/** A type that matches any valid {@link Hotkey} object. */
export type GenericHotkey = Replace<
    Hotkey<HotkeyOptions>,
    {
        enabled: ProcessedComputable<boolean>;
    }
>;

const uppercaseNumbers = [")", "!", "@", "#", "$", "%", "^", "&", "*", "("];

/**
 * Lazily creates a hotkey with the given options.
 * @param optionsFunc Hotkey options.
 */
export function createHotkey<T extends HotkeyOptions>(
    optionsFunc: OptionsFunc<T, BaseHotkey, GenericHotkey>
): Hotkey<T> {
    return createLazyProxy(feature => {
        const hotkey = optionsFunc.call(feature, feature);
        hotkey.type = HotkeyType;

        processComputable(hotkey as T, "enabled");
        setDefault(hotkey, "enabled", true);
        processComputable(hotkey as T, "description");

        return hotkey as unknown as Hotkey<T>;
    });
}

globalBus.on("addLayer", layer => {
    (findFeatures(layer, HotkeyType) as GenericHotkey[]).forEach(hotkey => {
        hotkeys[hotkey.key] = hotkey;
    });
});

globalBus.on("removeLayer", layer => {
    (findFeatures(layer, HotkeyType) as GenericHotkey[]).forEach(hotkey => {
        hotkeys[hotkey.key] = undefined;
    });
});

document.onkeydown = function (e) {
    if ((e.target as HTMLElement | null)?.tagName === "INPUT") {
        return;
    }
    if (hasWon.value && !player.keepGoing) {
        return;
    }
    const keysToCheck: string[] = [e.key];
    if (e.shiftKey && e.ctrlKey) {
        keysToCheck.splice(0, 1);
        keysToCheck.push("ctrl+shift+" + e.key.toUpperCase());
        keysToCheck.push("shift+ctrl+" + e.key.toUpperCase());
        if (uppercaseNumbers.includes(e.key)) {
            keysToCheck.push("ctrl+shift+" + uppercaseNumbers.indexOf(e.key));
            keysToCheck.push("shift+ctrl+" + uppercaseNumbers.indexOf(e.key));
        } else {
            keysToCheck.push("ctrl+shift+" + e.key.toLowerCase());
            keysToCheck.push("shift+ctrl+" + e.key.toLowerCase());
        }
    } else if (uppercaseNumbers.includes(e.key)) {
        keysToCheck.push("shift+" + e.key);
        keysToCheck.push("shift+" + uppercaseNumbers.indexOf(e.key));
    } else if (e.shiftKey) {
        keysToCheck.push("shift+" + e.key.toUpperCase());
        keysToCheck.push("shift+" + e.key.toLowerCase());
    } else if (e.ctrlKey) {
        // remove e.key since the key doesn't change based on ctrl being held or not
        keysToCheck.splice(0, 1);
        keysToCheck.push("ctrl+" + e.key);
    }
    const hotkey = hotkeys[keysToCheck.find(key => key in hotkeys) ?? ""];
    if (hotkey && unref(hotkey.enabled)) {
        e.preventDefault();
        hotkey.onPress();
    }
};

globalBus.on("setupVue", () =>
    registerInfoComponent(
        jsx(() => {
            const keys = Object.values(hotkeys).filter(hotkey => unref(hotkey?.enabled));
            if (keys.length === 0) {
                return "";
            }
            return (
                <div>
                    <br />
                    <h4>Hotkeys</h4>
                    <div style="column-count: 2">
                        {keys.map(hotkey => (
                            <div>
                                <Hotkey hotkey={hotkey as GenericHotkey} /> {unref(}
                            </div>
                        ))}
                    </div>
                </div>
            );
        })
    )
);
