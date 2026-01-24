import { useEffect, useRef } from "react";
import { createChristmasCountdown } from "./christmasCountdown.js";

export default function ChristmasCountdown() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const countdown = createChristmasCountdown();
    countdown.init(containerRef.current);

    return () => {
      countdown.cleanup();
    };
  }, []);

  return <div ref={containerRef} className="christmas-room" />;
}
