"use client";

import { useEffect, useState } from "react";

export function Greeting({ name }: { name: string }) {
  const [text, setText] = useState("Hello");

  useEffect(() => {
    // Reads the visitor's local clock (an external system, unknowable during SSR) —
    // not a "sync state from a prop" case, so the effect itself is correct here.
    const hour = new Date().getHours();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <h1 className="text-2xl font-semibold text-ink tracking-tight">
      {text}, {name}.
    </h1>
  );
}
