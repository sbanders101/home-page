import { useEffect, useRef } from "react";
import { createDnDDice } from "./dndDice.js";

export default function DnDDice() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const dice = createDnDDice();
    dice.init(containerRef.current);

    return () => {
      dice.cleanup();
    };
  }, []);

  return <div ref={containerRef} className="dnd-dice-room" />;
}
