// Usage snippets for the editor's code box. They use the library's two real entry points:
//   static: polypal(seed, options) -> SVG string        live: animate(host, polypal, options)
// Imports are local paths because the package is not published yet (see the Docs page).

export const FRAMEWORKS = [
  ['js', 'JavaScript'], ['react', 'React'], ['vue', 'Vue'], ['svelte', 'Svelte'], ['angular', 'Angular'], ['html', 'HTML'],
];

// Which snippets mirror code that actually runs in this project.
export const TESTED = { js: true, react: true, html: true };

const lit = (o) => (Object.keys(o).length ? `{ ${Object.entries(o).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')} }` : '{}');

function liveOptions({ name, pins, mood, motion, roam, react }, pad) {
  const lines = [`seed: ${JSON.stringify(name)},`];
  if (Object.keys(pins).length) lines.push(`pins: ${lit(pins)},`);
  if (mood !== 'neutral') lines.push(`mood: ${JSON.stringify(mood)},`);
  lines.push('size: 120,', `motion: ${JSON.stringify(motion)},`);
  if (roam) lines.push('roam: { speed: 70 },');
  if (react) lines.push('react: true,            // tap, touch or Enter reacts');
  return `{\n${lines.map((l) => `${pad}  ${l}`).join('\n')}\n${pad}}`;
}

export function snippet(fw, kind, s) {
  const staticOpts = lit(s.mood !== 'neutral' ? { ...s.pins, mood: s.mood } : s.pins);
  const call = `polypal(${JSON.stringify(s.name)}, ${staticOpts})`;
  const live = (pad) => liveOptions(s, pad);
  const isLive = kind === 'live';

  const imports = (extra = '') =>
    `import { makePolypal } from "./polypals/index.js";\n${isLive ? 'import { animate } from "./polypals/runtime.js";\n' : ''}import parts from "./polypals/parts.json";${extra}\n\nconst polypal = makePolypal(parts);`;

  if (fw === 'js') {
    return isLive
      ? `${imports()}\n\nconst rt = animate(document.querySelector("#box"), polypal, ${live('')});\n\n// rt.set({ mood: "angry" });  rt.destroy();`
      : `${imports()}\n\ndocument.querySelector("#polypal").innerHTML = ${call};`;
  }

  if (fw === 'react') {
    return isLive
      ? `import { useEffect, useRef } from "react";\n${imports()}\n\nexport function LivePolypal() {\n  const host = useRef(null);\n  useEffect(() => {\n    const rt = animate(host.current, polypal, ${live('    ')});\n    return () => rt.destroy();\n  }, []);\n  return <div ref={host} style={{ position: "relative", width: 240, height: 240 }} />;\n}`
      : `${imports()}\n\nexport function Polypal() {\n  const svg = ${call};\n  return <span dangerouslySetInnerHTML={{ __html: svg }} />;\n}`;
  }

  if (fw === 'vue') {
    return isLive
      ? `<script setup>\nimport { onBeforeUnmount, onMounted, ref } from "vue";\n${imports()}\n\nconst host = ref(null);\nlet rt;\nonMounted(() => {\n  rt = animate(host.value, polypal, ${live('  ')});\n});\nonBeforeUnmount(() => rt.destroy());\n</script>\n\n<template>\n  <div ref="host" style="position: relative; width: 240px; height: 240px" />\n</template>`
      : `<script setup>\n${imports()}\n\nconst svg = ${call};\n</script>\n\n<template>\n  <span v-html="svg" />\n</template>`;
  }

  if (fw === 'svelte') {
    return isLive
      ? `<script>\n  import { onMount } from "svelte";\n${imports().replace(/^/gm, '  ').replace(/^ {2}$/gm, '')}\n\n  let host;\n  onMount(() => {\n    const rt = animate(host, polypal, ${live('    ')});\n    return () => rt.destroy();\n  });\n</script>\n\n<div bind:this={host} style="position: relative; width: 240px; height: 240px"></div>`
      : `<script>\n${imports().replace(/^/gm, '  ').replace(/^ {2}$/gm, '')}\n\n  const svg = ${call};\n</script>\n\n{@html svg}`;
  }

  if (fw === 'angular') {
    return isLive
      ? `import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from "@angular/core";\n${imports()}\n\n@Component({\n  selector: "app-live-polypal",\n  standalone: true,\n  template: \`<div #host style="position: relative; width: 240px; height: 240px"></div>\`,\n})\nexport class LivePolypalComponent implements AfterViewInit, OnDestroy {\n  @ViewChild("host") host!: ElementRef<HTMLElement>;\n  private rt?: { destroy(): void };\n\n  ngAfterViewInit() {\n    this.rt = animate(this.host.nativeElement, polypal, ${live('    ')});\n  }\n  ngOnDestroy() {\n    this.rt?.destroy();\n  }\n}\n\n// tsconfig: "allowJs": true, "resolveJsonModule": true`
      : `import { Component } from "@angular/core";\nimport { DomSanitizer, SafeHtml } from "@angular/platform-browser";\n${imports()}\n\n@Component({\n  selector: "app-polypal",\n  standalone: true,\n  template: \`<span [innerHTML]="svg"></span>\`,\n})\nexport class PolypalComponent {\n  svg: SafeHtml;\n  constructor(sanitizer: DomSanitizer) {\n    // Angular strips <svg> unless it is explicitly trusted\n    this.svg = sanitizer.bypassSecurityTrustHtml(${call});\n  }\n}\n\n// tsconfig: "allowJs": true, "resolveJsonModule": true`;
  }

  // Plain HTML, no build step: parts.json is fetched instead of imported.
  const head = `<script type="module">\n  import { makePolypal } from "./polypals/index.js";\n${isLive ? '  import { animate } from "./polypals/runtime.js";\n' : ''}\n  const parts = await (await fetch("./polypals/parts.json")).json();\n  const polypal = makePolypal(parts);\n`;
  return isLive
    ? `<div id="box" style="position: relative; width: 480px; height: 320px"></div>\n\n${head}\n  animate(document.getElementById("box"), polypal, ${live('  ')});\n</script>`
    : `<div id="polypal"></div>\n\n${head}\n  document.getElementById("polypal").innerHTML = ${call};\n</script>`;
}
