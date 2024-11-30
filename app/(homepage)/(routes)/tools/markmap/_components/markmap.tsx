"use client";

import { Toolbar } from "markmap-toolbar";
import "markmap-toolbar/dist/style.css";
import { Markmap } from "markmap-view";
import React, { useEffect, useRef, useState } from "react";
import { transformer } from "./util";

const initValue = `# markmap

- beautiful 
- useful
- easy
- interactive
`;

function renderToolbar(mm: Markmap, wrapper: HTMLElement) {
  while (wrapper?.firstChild) wrapper.firstChild.remove();
  if (mm && wrapper) {
    const toolbar = new Toolbar();
    toolbar.attach(mm);
    // Register custom buttons
    toolbar.register({
      id: "alert",
      title: "Click to show an alert",
      content: "Alert",
      onClick: () => alert("You made it!"),
    });
    toolbar.setItems([...Toolbar.defaultItems, "alert"]);
    wrapper.append(toolbar.render());
  }
}

export default function MarkmapHooks() {
  const [value, setValue] = useState(initValue);
  // Ref for SVG element
  const refSvg = useRef<SVGSVGElement>() as any;
  // Ref for markmap object
  const refMm = useRef<Markmap>() as any;
  // Ref for toolbar wrapper
  const refToolbar = useRef<HTMLDivElement>() as any;

  useEffect(() => {
    // Create markmap and save to refMm
    if (refMm.current) return;
    const mm = Markmap.create(refSvg.current);
    console.log("create", refSvg.current);
    refMm.current = mm;
    renderToolbar(refMm.current, refToolbar.current);
  }, [refSvg.current]);

  useEffect(() => {
    // Update data for markmap once value is changed
    const mm = refMm.current;
    if (!mm) return;
    const { root } = transformer.transform(value);
    mm.setData(root);
    mm.fit();
  }, [refMm.current, value]);

  const handleChange = (e: any) => {
    setValue(e.target.value);
  };

  return (
    <React.Fragment>
      <div className="flex-1">
        <textarea
          className="w-full h-full border border-gray-400"
          value={value}
          onChange={handleChange}
        />
      </div>
      <svg className="flex-1" ref={refSvg} />
      <div className="absolute bottom-1 right-1" ref={refToolbar}></div>
    </React.Fragment>
  );
}
