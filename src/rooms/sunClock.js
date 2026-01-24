import { interpolateRgbFromHex } from "../utils/season.js";

const DAY_WEDGE_COLOR = "rgba(255,255,255,0.15)";
const NIGHT_WEDGE_COLOR = "rgba(0,0,0,0.1)";
const CIVIL_WEDGE_COLOR = "rgba(0,0,0,0.05)";

const DEFAULT_LAT = 40.7128;
const DEFAULT_LON = -74.006;

const SEASON_COLORS = {
  winter: { sky: "#D2EEFF", earth: "#EDF9FF" },
  spring: { sky: "#D4FCF2", earth: "#B1F6BE" },
  summer: { sky: "#A6F7E1", earth: "#67E9A7" },
  autumn: { sky: "#FFDACA", earth: "#FFA558" }
};

const hoursSinceMidnight = (date) =>
  date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

const hoursToAngle = (hours) => (hours / 24) * 2 * Math.PI;

const darkenRGBToBlack = (rgbStr, factor) => {
  const maxDark = 0.9;
  const actual = factor * maxDark;
  const parts = rgbStr.match(/\d+/g);
  if (!parts) {
    return rgbStr;
  }

  let r = parseInt(parts[0], 10);
  let g = parseInt(parts[1], 10);
  let b = parseInt(parts[2], 10);

  r = Math.floor(r * (1 - actual));
  g = Math.floor(g * (1 - actual));
  b = Math.floor(b * (1 - actual));
  return `rgb(${r}, ${g}, ${b})`;
};

const getSeasonalColors = (dateObj) => {
  const year = dateObj.getFullYear();

  const autumnPrev = {
    sky: SEASON_COLORS.autumn.sky,
    earth: SEASON_COLORS.autumn.earth,
    fullDate: new Date(`${year - 1}-10-15`)
  };
  const winter = {
    sky: SEASON_COLORS.winter.sky,
    earth: SEASON_COLORS.winter.earth,
    fullDate: new Date(`${year}-01-15`)
  };
  const spring = {
    sky: SEASON_COLORS.spring.sky,
    earth: SEASON_COLORS.spring.earth,
    fullDate: new Date(`${year}-04-15`)
  };
  const summer = {
    sky: SEASON_COLORS.summer.sky,
    earth: SEASON_COLORS.summer.earth,
    fullDate: new Date(`${year}-07-15`)
  };
  const autumn = {
    sky: SEASON_COLORS.autumn.sky,
    earth: SEASON_COLORS.autumn.earth,
    fullDate: new Date(`${year}-10-15`)
  };
  const winterNext = {
    sky: SEASON_COLORS.winter.sky,
    earth: SEASON_COLORS.winter.earth,
    fullDate: new Date(`${year + 1}-01-15`)
  };

  let cp;
  if (dateObj < winter.fullDate) {
    cp = { start: autumnPrev, end: winter };
  } else if (dateObj < spring.fullDate) {
    cp = { start: winter, end: spring };
  } else if (dateObj < summer.fullDate) {
    cp = { start: spring, end: summer };
  } else if (dateObj < autumn.fullDate) {
    cp = { start: summer, end: autumn };
  } else {
    cp = { start: autumn, end: winterNext };
  }

  const range = cp.end.fullDate - cp.start.fullDate;
  const progress = (dateObj - cp.start.fullDate) / range;

  return {
    skyColor: interpolateRgbFromHex(cp.start.sky, cp.end.sky, progress),
    earthColor: interpolateRgbFromHex(cp.start.earth, cp.end.earth, progress)
  };
};

export const createSunClock = () => {
  let container = null;
  let sky = null;
  let earth = null;
  let canvas = null;
  let timeDisplay = null;
  let rafId = null;
  let lastTick = 0;
  let resizeHandler = null;
  let keyHandler = null;
  let abortController = null;
  let isActive = false;

  let sunriseTime = null;
  let sunsetTime = null;
  let civilTwilightBeginTime = null;
  let civilTwilightEndTime = null;

  const updateTimeDisplay = (now) => {
    if (!timeDisplay) {
      return;
    }
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    timeDisplay.textContent = `${yy} . ${mm} . ${dd} . ${hh} . ${min}`;
  };

  const getTwilightDarkeningFactor = (now) => {
    if (
      !sunriseTime ||
      !sunsetTime ||
      !civilTwilightBeginTime ||
      !civilTwilightEndTime
    ) {
      return 0;
    }

    const nowH = hoursSinceMidnight(now);
    const sr = hoursSinceMidnight(sunriseTime);
    const ss = hoursSinceMidnight(sunsetTime);
    const ctb = hoursSinceMidnight(civilTwilightBeginTime);
    const cte = hoursSinceMidnight(civilTwilightEndTime);

    if (nowH >= sr && nowH <= ss) {
      return 0;
    }
    if (nowH >= ss && nowH < cte) {
      return (nowH - ss) / (cte - ss);
    }
    if (nowH >= cte && nowH < ctb + 24) {
      return 1;
    }
    if (nowH >= ctb && nowH < sr) {
      return 1 - (nowH - ctb) / (sr - ctb);
    }
    return 1;
  };

  const updateSeasonalBackgrounds = (now) => {
    if (!sky || !earth) {
      return;
    }

    const { skyColor, earthColor } = getSeasonalColors(now);
    const twilightFactor = getTwilightDarkeningFactor(now);

    const skyDark = darkenRGBToBlack(skyColor, twilightFactor);
    const earthDark = darkenRGBToBlack(earthColor, twilightFactor);

    const skyDarker = darkenRGBToBlack(skyDark, 0.15);
    const earthDarker = darkenRGBToBlack(earthDark, 0.15);

    sky.style.background = `linear-gradient(to bottom, ${skyDarker}, ${skyDark})`;
    earth.style.background = `linear-gradient(to bottom, ${earthDark}, ${earthDarker})`;
  };

  const drawSunCircle = (now) => {
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) * 0.4;

    let srH = 6;
    let ssH = 18;
    let ctbH = 5.5;
    let cteH = 18.5;
    if (sunriseTime && sunsetTime && civilTwilightBeginTime && civilTwilightEndTime) {
      srH = hoursSinceMidnight(sunriseTime);
      ssH = hoursSinceMidnight(sunsetTime);
      ctbH = hoursSinceMidnight(civilTwilightBeginTime);
      cteH = hoursSinceMidnight(civilTwilightEndTime);
    }

    const srAngle = hoursToAngle(srH);
    const ssAngle = hoursToAngle(ssH);
    const ctbAngle = hoursToAngle(ctbH);
    const cteAngle = hoursToAngle(cteH);

    const nowAngle = hoursToAngle(hoursSinceMidnight(now));

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-nowAngle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, ctbAngle, srAngle, false);
    ctx.closePath();
    ctx.fillStyle = CIVIL_WEDGE_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, srAngle, ssAngle, false);
    ctx.closePath();
    ctx.fillStyle = DAY_WEDGE_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, ssAngle, cteAngle, false);
    ctx.closePath();
    ctx.fillStyle = CIVIL_WEDGE_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, cteAngle, ctbAngle + 2 * Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = NIGHT_WEDGE_COLOR;
    ctx.fill();

    ctx.restore();
  };

  const updateDisplay = () => {
    const now = new Date();
    updateTimeDisplay(now);
    updateSeasonalBackgrounds(now);
    drawSunCircle(now);
  };

  const resizeCanvas = () => {
    if (!canvas) {
      return;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const tick = (timestamp) => {
    if (!isActive) {
      return;
    }

    if (!lastTick || timestamp - lastTick >= 1000) {
      updateDisplay();
      lastTick = timestamp;
    }

    rafId = window.requestAnimationFrame(tick);
  };

  const fetchSunTimes = (lat, lon) => {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`;
    fetch(url, { signal: abortController.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!isActive) {
          return;
        }
        sunriseTime = new Date(data.results.sunrise);
        sunsetTime = new Date(data.results.sunset);
        civilTwilightBeginTime = new Date(data.results.civil_twilight_begin);
        civilTwilightEndTime = new Date(data.results.civil_twilight_end);
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          return;
        }
        console.warn("API fetch failed, defaulting to 12h day.", err);
        sunriseTime = null;
        sunsetTime = null;
        civilTwilightBeginTime = null;
        civilTwilightEndTime = null;
      });
  };

  const toggleTimeDisplay = () => {
    if (!timeDisplay) {
      return;
    }
    timeDisplay.style.display =
      timeDisplay.style.display === "none" ? "" : "none";
  };

  const init = (host) => {
    if (!host) {
      return;
    }

    container = host;
    container.innerHTML = "";

    sky = document.createElement("div");
    sky.className = "sun-clock__sky";

    earth = document.createElement("div");
    earth.className = "sun-clock__earth";

    canvas = document.createElement("canvas");
    canvas.className = "sun-clock__canvas";

    timeDisplay = document.createElement("div");
    timeDisplay.className = "sun-clock__time";

    container.append(sky, earth, canvas, timeDisplay);

    isActive = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchSunTimes(pos.coords.latitude, pos.coords.longitude),
        (err) => {
          console.warn("Geolocation failed, defaulting to NY.", err);
          fetchSunTimes(DEFAULT_LAT, DEFAULT_LON);
        }
      );
    } else {
      console.warn("Geolocation not supported, defaulting to NY.");
      fetchSunTimes(DEFAULT_LAT, DEFAULT_LON);
    }

    resizeHandler = () => resizeCanvas();
    window.addEventListener("resize", resizeHandler);

    keyHandler = (event) => {
      if (event.key && event.key.toLowerCase() === "t") {
        toggleTimeDisplay();
      }
    };
    document.addEventListener("keydown", keyHandler);

    resizeCanvas();
    updateDisplay();
    rafId = window.requestAnimationFrame(tick);
  };

  const cleanup = () => {
    isActive = false;

    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }

    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
    }

    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler);
    }

    if (abortController) {
      abortController.abort();
    }

    if (container) {
      container.innerHTML = "";
    }

    sky = null;
    earth = null;
    canvas = null;
    timeDisplay = null;
    container = null;
    rafId = null;
    lastTick = 0;
    resizeHandler = null;
    keyHandler = null;
    abortController = null;
    sunriseTime = null;
    sunsetTime = null;
    civilTwilightBeginTime = null;
    civilTwilightEndTime = null;
  };

  return { init, cleanup };
};
