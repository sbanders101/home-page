const SNOWFLAKE_COUNT = 50;

const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const createSnowflakes = (container) => {
  const flakes = [];

  for (let i = 0; i < SNOWFLAKE_COUNT; i += 1) {
    const snowflake = document.createElement("div");
    snowflake.className = "christmas__snowflake";
    snowflake.textContent = "❆";
    snowflake.style.left = `${Math.random() * 100}vw`;
    snowflake.style.animationDuration = `${Math.random() * 5 + 5}s`;
    snowflake.style.fontSize = `${Math.random() * 1 + 1}rem`;
    snowflake.style.opacity = `${Math.random() * 0.8 + 0.2}`;
    snowflake.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(snowflake);
    flakes.push(snowflake);
  }

  return flakes;
};

export const createChristmasCountdown = () => {
  let container = null;
  let scene = null;
  let countdownEl = null;
  let timerId = null;
  let snowflakes = [];

  const updateCountdown = () => {
    if (!countdownEl) {
      return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const christmasDate = new Date(currentYear, 11, 25);

    if (now > christmasDate) {
      christmasDate.setFullYear(currentYear + 1);
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((christmasDate - now) / millisecondsPerDay);

    if (daysLeft > 1) {
      countdownEl.textContent = `${daysLeft} days to go!`;
    } else if (daysLeft === 1) {
      countdownEl.textContent = "One more day!";
    } else {
      countdownEl.textContent = "🎄";
    }
  };

  const init = (host) => {
    if (!host) {
      return;
    }

    container = host;
    container.innerHTML = "";

    scene = document.createElement("div");
    scene.className = "christmas";

    if (isSafari()) {
      scene.classList.add("christmas--safari");
    }

    const heading = document.createElement("h1");
    heading.className = "christmas__title";
    heading.textContent = "Merry Christmas to All!!";

    countdownEl = document.createElement("div");
    countdownEl.className = "christmas__countdown";

    scene.append(heading, countdownEl);
    container.append(scene);

    snowflakes = createSnowflakes(scene);

    updateCountdown();
    timerId = window.setInterval(updateCountdown, 60 * 60 * 1000);
  };

  const cleanup = () => {
    if (timerId) {
      window.clearInterval(timerId);
    }

    if (container) {
      container.innerHTML = "";
    }

    container = null;
    scene = null;
    countdownEl = null;
    timerId = null;
    snowflakes = [];
  };

  return { init, cleanup };
};
