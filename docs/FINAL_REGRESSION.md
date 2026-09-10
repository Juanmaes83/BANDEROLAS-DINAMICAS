# Final regression gate — BANDEROLAS PRO

Do not merge to `main` until this gate has been validated in a normal desktop browser and, when possible, touch/mobile.

## Core interaction

1. Open production `index.html` and confirm blank project.
2. FABRIC / INTERACT is available and cloth can be grabbed near center, lower edge and sides.
3. Drag hard left/right/down, release and confirm physical recovery.
4. Change Grip radius from 40 to 140 and confirm only hit tolerance changes.
5. Switch EDIT CONTENT <-> FABRIC / INTERACT repeatedly; cloth engine must not reset unexpectedly.

## Composition

6. Add 1 video, 3 images, 1 logo and 6 text layers.
7. Set hero video to FULL BLEED and confirm no background margin remains.
8. Test 3/4, 2/3, 1/2, 1/3, 1/4 and return to FULL BLEED.
9. Change 9:16 -> 1:1 -> 16:9 and confirm compositor + cloth remain synchronized.
10. Move, resize, rotate, crop, zoom, reorder, lock/unlock and delete elements.

## Persistence

11. SAVE PROJECT, reload, OPEN and confirm composition is restored.
12. DOWNLOAD JSON, create a blank project, IMPORT JSON and confirm all layers/assets return.
13. Test Undo/Redo after text, layout and format changes.

## Static export

14. DESIGN PNG must export at exact design resolution for the selected format.
15. FABRIC FRAME PNG must capture the deformed WebGL frame without the editor panel.

## Video export

16. START RECORD, interact with cloth for at least 5 seconds, STOP.
17. DOWNLOAD VIDEO and open the recording.
18. DOWNLOAD MP4. If the browser recorded MP4 natively, confirm direct output. If it recorded WebM, confirm ffmpeg.wasm fallback creates a playable MP4.

## Interactive delivery

19. OPEN PREVIEW: live video must continue playing while cloth can be grabbed/stretched.
20. DOWNLOAD INTERACTIVE: open generated HTML and repeat interaction.
21. DOWNLOAD ZIP: unzip; confirm `index.html`, `project.json`, `README.txt`, `assets/`; open `index.html` and interact.

## Share / Embed

22. With a small/medium project, COPY SHARE URL -> open in another tab -> interaction works.
23. COPY IFRAME EMBED -> place snippet in a test HTML page -> viewer fills container and remains interactive.
24. With a video-heavy project exceeding URL safety threshold, editor must refuse fragile URL share and direct the user to ZIP/HTML instead.

## Physics lab

25. Open `labs/physics-ab.html`, compare A vs B. No decision in the lab may change production automatically.

## Merge condition

Merge only after the human reviewer confirms the regression gate is acceptable. If a failure is found, fix it on the same branch and rerun only the affected gate plus core interaction checks 1–5.