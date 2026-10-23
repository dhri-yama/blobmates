// Usage snippets for the editor's code box and the docs. They use the published package:
//   static: polypal(seed, options) -> SVG string        live: animate(host, polypal, options)
//   React:  <Polypal /> and <LivePolypal /> from "@dhriyama/polypals/react"
import pkg from '@dhriyama/polypals/package.json';

const NAME = pkg.name;
const CDN = `https://cdn.jsdelivr.net/npm/${NAME}@${pkg.version}/src`;

export const INSTALL = `npm install ${NAME}`;

export const FRAMEWORKS = [
  ['js', 'JavaScript'], ['react', 'React'], ['vue', 'Vue'], ['svelte', 'Svelte'], ['angular', 'Angular'], ['html', 'HTML'],
];

// Which samples are known to run: the React components and the plain JavaScript calls are tested against the
// installed package. Vue, Svelte and Angular use the same calls in each framework's usual way but are not run.
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

// JSX props for the React components: simple values become attributes, objects become {{ ... }}.
function jsxProps(entries) {
  return entries.map(([k, v]) => (v === true ? k : typeof v === 'string' ? `${k}=${JSON.stringify(v)}` : `${k}={${typeof v === 'object' ? lit(v) : JSON.stringify(v)}}`)).join(' ');
}

export function snippet(fw, kind, s) {
  const staticOpts = lit(s.mood !== 'neutral' ? { ...s.pins, mood: s.mood } : s.pins);
  const call = `polypal(${JSON.stringify(s.name)}, ${staticOpts})`;
  const live = (pad) => liveOptions(s, pad);
  const isLive = kind === 'live';

  const imports = `import { polypal } from "${NAME}";${isLive ? `\nimport { animate } from "${NAME}/runtime";` : ''}`;

  if (fw === 'js') {
    return isLive
      ? `${imports}\n\nconst rt = animate(document.querySelector("#box"), polypal, ${live('')});\n\n// rt.set({ mood: "angry" });  rt.destroy();`
      : `${imports}\n\ndocument.querySelector("#polypal").innerHTML = ${call};`;
  }

  if (fw === 'react') {
    if (!isLive) {
      const props = jsxProps([['seed', s.name], ...Object.entries(s.mood !== 'neutral' ? { ...s.pins, mood: s.mood } : s.pins)]);
      return `import { Polypal } from "${NAME}/react";\n\nexport function Example() {\n  return <Polypal ${props} />;\n}`;
    }
    const props = jsxProps([
      ['seed', s.name],
      ...(Object.keys(s.pins).length ? [['pins', s.pins]] : []),
      ...(s.mood !== 'neutral' ? [['mood', s.mood]] : []),
      ['motion', s.motion],
      ...(s.roam ? [['roam', true]] : []),
      ...(s.react ? [['react', true]] : []),
    ]);
    return s.roam
      ? `import { LivePolypal } from "${NAME}/react";\n\n// with roam it fills its parent, so give the parent a size\nexport function Example() {\n  return (\n    <div style={{ position: "relative", height: 320 }}>\n      <LivePolypal ${props} />\n    </div>\n  );\n}`
      : `import { LivePolypal } from "${NAME}/react";\n\nexport function Example() {\n  return <LivePolypal ${props} size={120} />;\n}\n\n// runs in the browser only: in Next.js add "use client" at the top`;
  }

  if (fw === 'vue') {
    return isLive
      ? `<script setup>\nimport { onBeforeUnmount, onMounted, ref } from "vue";\n${imports}\n\nconst host = ref(null);\nlet rt;\nonMounted(() => {\n  rt = animate(host.value, polypal, ${live('  ')});\n});\nonBeforeUnmount(() => rt.destroy());\n</script>\n\n<template>\n  <div ref="host" style="position: relative; width: 240px; height: 240px" />\n</template>`
      : `<script setup>\n${imports}\n\nconst svg = ${call};\n</script>\n\n<template>\n  <span v-html="svg" />\n</template>`;
  }

  if (fw === 'svelte') {
    const ind = (t) => t.replace(/^/gm, '  ');
    return isLive
      ? `<script>\n  import { onMount } from "svelte";\n${ind(imports)}\n\n  let host;\n  onMount(() => {\n    const rt = animate(host, polypal, ${live('    ')});\n    return () => rt.destroy();\n  });\n</script>\n\n<div bind:this={host} style="position: relative; width: 240px; height: 240px"></div>`
      : `<script>\n${ind(imports)}\n\n  const svg = ${call};\n</script>\n\n{@html svg}`;
  }

  if (fw === 'angular') {
    return isLive
      ? `import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from "@angular/core";\n${imports}\n\n@Component({\n  selector: "app-live-polypal",\n  standalone: true,\n  template: \`<div #host style="position: relative; width: 240px; height: 240px"></div>\`,\n})\nexport class LivePolypalComponent implements AfterViewInit, OnDestroy {\n  @ViewChild("host") host!: ElementRef<HTMLElement>;\n  private rt?: { destroy(): void };\n\n  ngAfterViewInit() {\n    this.rt = animate(this.host.nativeElement, polypal, ${live('    ')});\n  }\n  ngOnDestroy() {\n    this.rt?.destroy();\n  }\n}`
      : `import { Component } from "@angular/core";\nimport { DomSanitizer, SafeHtml } from "@angular/platform-browser";\n${imports}\n\n@Component({\n  selector: "app-polypal",\n  standalone: true,\n  template: \`<span [innerHTML]="svg"></span>\`,\n})\nexport class PolypalComponent {\n  svg: SafeHtml;\n  constructor(sanitizer: DomSanitizer) {\n    // Angular strips <svg> unless it is explicitly trusted\n    this.svg = sanitizer.bypassSecurityTrustHtml(${call});\n  }\n}`;
  }

  // Plain HTML, no build step: load the package straight from a CDN.
  const head = `<script type="module">\n  import { polypal } from "${CDN}/main.js";\n${isLive ? `  import { animate } from "${CDN}/runtime.js";\n` : ''}`;
  return isLive
    ? `<div id="box" style="position: relative; width: 480px; height: 320px"></div>\n\n${head}\n  animate(document.getElementById("box"), polypal, ${live('  ')});\n</script>`
    : `<div id="polypal"></div>\n\n${head}\n  document.getElementById("polypal").innerHTML = ${call};\n</script>`;
}
