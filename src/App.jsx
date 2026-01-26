import { useEffect, useState } from "react";
import SeasonalAbstracts from "./rooms/SeasonalAbstracts.jsx";
import SunClock from "./rooms/SunClock.jsx";
import ChristmasCountdown from "./rooms/ChristmasCountdown.jsx";
import DnDDice from "./rooms/DnDDice.jsx";

const TRANSITION_MS = 280;

const DEFAULT_ROUTE = "/sun";
const ROOMS_ROUTE = "/rooms";

const ROUTES = {
  [ROOMS_ROUTE]: Home,
  "/sun": SunClock,
  "/seasonal": SeasonalAbstracts,
  "/christmas": ChristmasCountdown,
  "/dice": DnDDice
};

const ROOM_LINKS = [
  {
    name: "Sun Clock",
    path: "#/sun",
    detail: "Solar time wedge, sunrise/sunset, local sky."
  },
  {
    name: "Seasonal Abstracts",
    path: "#/seasonal",
    detail: "Day-of-year palette study and abstract forms."
  },
  {
    name: "Christmas Countdown",
    path: "#/christmas",
    detail: "Old-timey countdown with snow and sparkle."
  },
  {
    name: "D&D Dice",
    path: "#/dice",
    detail: "Click to roll classic tabletop dice with history."
  }
];

const getHashPath = () => {
  const hash = window.location.hash || "#/";
  const path = hash.replace(/^#/, "");
  if (path === "") {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
};

const getEffectivePath = () => {
  const hash = window.location.hash;
  if (!hash || hash === "#/") {
    return DEFAULT_ROUTE;
  }
  return getHashPath();
};

export default function App() {
  const [path, setPath] = useState(getEffectivePath());
  const [displayPath, setDisplayPath] = useState(getEffectivePath());
  const [menuOpen, setMenuOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!window.location.hash || window.location.hash === "#/") {
      window.location.hash = `#${DEFAULT_ROUTE}`;
    }

    const handleChange = () => {
      if (window.location.hash === "#/") {
        window.location.hash = `#${DEFAULT_ROUTE}`;
        return;
      }
      setPath(getEffectivePath());
    };
    window.addEventListener("hashchange", handleChange);

    return () => window.removeEventListener("hashchange", handleChange);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReduceMotion(mediaQuery.matches);

    handleChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      if (displayPath !== path) {
        setDisplayPath(path);
      }
      setIsTransitioning(false);
      return undefined;
    }

    if (path === displayPath) {
      return undefined;
    }

    setIsTransitioning(true);
    const timer = window.setTimeout(() => {
      setDisplayPath(path);
      setIsTransitioning(false);
    }, TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [path, reduceMotion, displayPath]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleKey = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  const RouteComponent = ROUTES[displayPath] ?? NotFound;
  const isFullBleedRoute =
    displayPath === "/seasonal" ||
    displayPath === "/sun" ||
    displayPath === "/christmas" ||
    displayPath === "/dice";

  return (
    <div
      className={`min-h-screen ${
        isFullBleedRoute ? "" : "px-6 py-10 sm:px-10"
      }`}
    >
      <GlyphMenu
        isOpen={menuOpen}
        onToggle={() => setMenuOpen((current) => !current)}
        onClose={() => setMenuOpen(false)}
      />
      <div
        className={`${isFullBleedRoute ? "relative min-h-screen full-bleed" : "mx-auto max-w-3xl"} room-transition ${
          isTransitioning ? "room-transition--out" : ""
        }`}
      >
        <RouteComponent />
      </div>
    </div>
  );
}

function GlyphMenu({ isOpen, onToggle, onClose }) {
  return (
    <div className="safe-area fixed left-4 top-4 z-50 sm:left-6 sm:top-6">
      <button
        type="button"
        aria-label="Open room menu"
        aria-expanded={isOpen}
        aria-controls="room-menu"
        onClick={onToggle}
        className="ui-button flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline-none"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <circle cx="4.5" cy="9" r="1.6" fill="currentColor" />
          <circle cx="9" cy="9" r="1.6" fill="currentColor" />
          <circle cx="13.5" cy="9" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {isOpen ? (
        <nav id="room-menu" className="ui-panel mt-3 w-56 p-2">
          <p className="px-3 pb-1 pt-2 text-[0.6rem] uppercase tracking-[0.35em] text-stone-500">
            Rooms
          </p>
          <div className="space-y-1 pb-1">
            {ROOM_LINKS.map((room) => (
              <a
                key={room.path}
                href={room.path}
                onClick={onClose}
                className="ui-menu-item block rounded-xl px-3 py-2 text-sm text-stone-700 transition focus-visible:outline-none"
              >
                {room.name}
              </a>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function Home() {
  return (
    <section className="space-y-8">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-stone-600">
          Personal Homepage V2
        </p>
        <h1 className="font-display text-4xl text-stone-900 sm:text-5xl">
          Three rooms, one atmosphere.
        </h1>
        <p className="max-w-2xl text-base text-stone-700">
          Choose a room to enter. Each one will become a fullscreen experience
          with shared navigation and organic transitions.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {ROOM_LINKS.map((room) => (
          <a
            key={room.path}
            className="group ui-card"
            href={room.path}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-stone-900">
                {room.name}
              </h2>
              <span className="text-sm text-stone-500 transition group-hover:text-stone-700">
                Enter
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-600">{room.detail}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function Room({ title, summary }) {
  return (
    <section className="space-y-6">
      <div className="ui-pill inline-flex items-center gap-2 rounded-full text-xs uppercase tracking-[0.3em] text-stone-600">
        Room Shell
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-4xl text-stone-900">{title}</h1>
        <p className="max-w-2xl text-base text-stone-700">{summary}</p>
      </div>
      <a className="text-sm text-stone-700 underline" href="#/rooms">
        Back to rooms
      </a>
    </section>
  );
}

function NotFound() {
  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl text-stone-900">Not found</h1>
      <p className="text-stone-700">
        That room does not exist yet. Return home to choose another route.
      </p>
      <a className="text-sm text-stone-700 underline" href="#/rooms">
        Back to rooms
      </a>
    </section>
  );
}
