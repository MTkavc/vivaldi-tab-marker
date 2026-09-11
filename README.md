# Vivaldi Tab Marker v1.0

A small Vivaldi UI mod for people who keep many tabs open and want a quick visual marker directly on a tab.

The mod adds a **coloured star at the right edge of a tab**. Right-clicking a tab also shows a small three-star palette next to Vivaldi's normal context menu.

## What it does

- Three marker colours: **blue, yellow, red**.
- Right-click a tab to show the marker palette.
- The active colour is shown as a **crossed-out star** in the palette; click it to remove the marker.
- The marked tab keeps Vivaldi's normal close button. On hover, the close button moves to the left of the star.
- The tab title fades underneath the star / close-button area instead of being sharply cut off.
- The marker palette closes together with Vivaldi's normal context menu.

## Status / limitations

- This is a **Vivaldi UI JavaScript mod**, not a Chrome/Vivaldi extension.
- v1.0 is primarily designed and tested with **vertical tabs**.
- Horizontal tabs have fallback positioning, but have not been tested as extensively.
- **Markers are not reliably restored after fully closing/restarting Vivaldi.** Reliable cross-session persistence is intentionally not claimed in v1.0.
- A Vivaldi update can overwrite the modified UI file. If that happens, run `install.cmd` again.
- Because this mod depends on Vivaldi's internal UI structure, a future Vivaldi release may require an update to the mod.

## Tested on

- Vivaldi **8.2.4133.52**
- Chromium **152.0.7977.124**
- Windows 10
- Vertical tab bar

## Automatic installation (Windows)

1. **Close all Vivaldi windows.**
2. Extract this ZIP to a normal folder.
3. Run `install.cmd`.
4. Start Vivaldi.

The installer searches the usual per-user and system-wide Vivaldi installation locations, copies `tab-marker-vivaldi.js` to a `custom-js` folder, and adds one script tag to Vivaldi's UI HTML file.

If Vivaldi is installed under `Program Files`, Windows may require administrator rights.

### About `ExecutionPolicy Bypass`

`install.cmd` starts the included local PowerShell script with `-ExecutionPolicy Bypass`. This only allows that local script to run; it does not change your permanent PowerShell policy. If you prefer not to use it, use the manual installation below.

## Manual installation

1. Close Vivaldi.
2. Find your current Vivaldi version folder. Typical locations are:
   - `%LOCALAPPDATA%\Vivaldi\Application\<version>\resources\vivaldi`
   - `C:\Program Files\Vivaldi\Application\<version>\resources\vivaldi`
3. Create a folder named `custom-js` inside `resources\vivaldi` if it does not already exist.
4. Copy `tab-marker-vivaldi.js` into `custom-js`.
5. Open `window.html` in `resources\vivaldi` in a text editor. If your build uses `browser.html` instead, edit that file.
6. Immediately before `</body>`, add:

```html
<script src="custom-js/tab-marker-vivaldi.js"></script>
```

7. Save the file and start Vivaldi.

## Uninstall

Automatic:

1. Close Vivaldi.
2. Run `uninstall.cmd`.
3. Start Vivaldi.

Manual:

1. Remove this line from `window.html` / `browser.html`:

```html
<script src="custom-js/tab-marker-vivaldi.js"></script>
```

2. Delete `custom-js\tab-marker-vivaldi.js`.
3. Start Vivaldi.

## Why this exists

Vivaldi already offers excellent tab management, especially vertical tabs, stacks and workspaces. With very large tab sets, however, it can still be useful to mark a few individual tabs visually without moving or grouping them.

The ideal native version would be something like:

**Right-click tab → Mark tab → coloured star / remove marker**

This mod is also a proof of concept for that feature request.

## Security / privacy

The mod contains no networking code and does not send tab titles, URLs or other data anywhere. The source is plain JavaScript and PowerShell and can be inspected before installation.

## License

MIT License. See `LICENSE`.
