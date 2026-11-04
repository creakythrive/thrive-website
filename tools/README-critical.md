# Critical CSS

`crit-*.css` are the above-the-fold styles inlined into index, home-use, sport and contact so the
page can paint before thrive-all.css arrives (which then loads async via preload + onload).

Regenerate whenever thrive-all.css changes, otherwise a page may briefly show unstyled:
run Penthouse against each live page at 414x896 and 1366x768 with thrive-all.css as the source,
merge the two outputs with csso, save as tools/crit-<page>.css, and paste into the page's
<style id="critical"> block. Claude does this on request.
