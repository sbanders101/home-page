import { useEffect, useRef } from "react";
import { createSunClock } from "./sunClock.js";

export default function SunClock() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const sunClock = createSunClock();
    sunClock.init(containerRef.current);

    return () => {
      sunClock.cleanup();
    };
  }, []);

  return <div ref={containerRef} className="sun-clock" />;
}
