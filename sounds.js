/**
 * Sound registry — add a new critter here and it appears in the picker.
 *
 * Each entry needs:
 *   - label:  display name shown in the dropdown and page title
 *   - emoji:  big emoji shown as the animated critter
 *   - file:   path to the mp3 (relative to index.html)
 *   - name:   noun for the title, e.g. "Pigtronome" -> title = name + "tronome"
 *   - theme:  CSS variable overrides for the background + accent palette
 *
 * Theme variables (all optional — omit to fall back to defaults in styles.css):
 *   --bg-start, --bg-end       gradient background
 *   --accent                   primary accent (buttons, active dot, BPM number)
 *   --accent-dark              button hover
 *   --accent-deep              accent-beat dot color
 *   --accent-soft              inactive dot / select border
 *   --accent-disabled          disabled button background
 *   --text, --text-muted       body / secondary text
 *   --shadow                   container drop shadow color
 */
const SOUNDS = {
    snort: {
        label: "Pig",
        name: "Pigtronome",
        emoji: "🐷",
        file: "snort.mp3",
        theme: {
            "--bg-start": "#ffe4e1",
            "--bg-end": "#ffd1dc",
            "--accent": "#cc3366",
            "--accent-dark": "#a82a55",
            "--accent-deep": "#8b0000",
            "--accent-soft": "#f5b7c5",
            "--accent-disabled": "#d9a8b6",
            "--text": "#4a2a3a",
            "--text-muted": "#8b4a5c",
            "--shadow": "rgba(204, 51, 102, 0.15)"
        }
    },
    quack: {
        label: "Duck",
        name: "Ducktronome",
        emoji: "🦆",
        file: "quack.mp3",
        theme: {
            "--bg-start": "#fff9d6",
            "--bg-end": "#ffe58a",
            "--accent": "#e6a800",
            "--accent-dark": "#b38600",
            "--accent-deep": "#7a5c00",
            "--accent-soft": "#f7e39a",
            "--accent-disabled": "#e8d68a",
            "--text": "#4a3a10",
            "--text-muted": "#8b6f2a",
            "--shadow": "rgba(230, 168, 0, 0.2)"
        }
    },
    fart: {
        label: "Fart",
        name: "Fartronome",
        emoji: "💨",
        file: "fart.mp3",
        theme: {
            "--bg-start": "#e8f5d8",
            "--bg-end": "#c8e6a0",
            "--accent": "#6b8e23",
            "--accent-dark": "#556b2f",
            "--accent-deep": "#3a4d1a",
            "--accent-soft": "#c8dba0",
            "--accent-disabled": "#b8c9a0",
            "--text": "#2a3a10",
            "--text-muted": "#5a6b30",
            "--shadow": "rgba(107, 142, 35, 0.2)"
        }
    }
};

const DEFAULT_SOUND = "snort";
