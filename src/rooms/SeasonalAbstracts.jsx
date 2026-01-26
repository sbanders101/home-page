import { useEffect, useMemo, useState } from "react";
import {
  getDayOfYear,
  interpolateHexColor,
  interpolateValue
} from "../utils/season.js";

const SEASONAL_ANCHORS = [
  {
    dayOfYear: 33,
    shapeCount: 3,
    shapeColors: ["#AEEAF2", "#85CEF2", "#90AEE8", "#9F99EC", "#CAB8F1"],
    backgroundColor: "#EAF6FA"
  },
  {
    dayOfYear: 125,
    shapeCount: 20,
    shapeColors: ["#FD75AA", "#FDFC75", "#75CBFD", "#BDFD75", "#FD759F"],
    backgroundColor: "#92FD75"
  },
  {
    dayOfYear: 217,
    shapeCount: 6,
    shapeColors: ["#FFFD31", "#00DF21", "#FFDE00", "#FFFC00", "#FF4205"],
    backgroundColor: "#A3FCFE"
  },
  {
    dayOfYear: 309,
    shapeCount: 13,
    shapeColors: ["#FA980A", "#FA0A0A", "#AD4E00", "#FFDF08", "#FF8108"],
    backgroundColor: "#FFE292"
  },
  {
    dayOfYear: 398,
    shapeCount: 3,
    shapeColors: ["#AEEAF2", "#85CEF2", "#90AEE8", "#9F99EC", "#CAB8F1"],
    backgroundColor: "#EAF6FA"
  }
];


const getSeasonalAttributes = (date) => {
  const doy = getDayOfYear(date);
  const firstAnchorDay = SEASONAL_ANCHORS[0].dayOfYear;
  const adjustedDoy = doy < firstAnchorDay ? doy + 365 : doy;
  let index = 0;

  for (let idx = 0; idx < SEASONAL_ANCHORS.length - 1; idx += 1) {
    if (
      adjustedDoy >= SEASONAL_ANCHORS[idx].dayOfYear &&
      adjustedDoy < SEASONAL_ANCHORS[idx + 1].dayOfYear
    ) {
      index = idx;
      break;
    }
    if (
      adjustedDoy >= SEASONAL_ANCHORS[SEASONAL_ANCHORS.length - 2].dayOfYear
    ) {
      index = SEASONAL_ANCHORS.length - 2;
    }
  }

  const anchor1 = SEASONAL_ANCHORS[index];
  const anchor2 = SEASONAL_ANCHORS[index + 1];
  const fraction =
    (adjustedDoy - anchor1.dayOfYear) /
    (anchor2.dayOfYear - anchor1.dayOfYear);

  const shapeCount = Math.round(
    interpolateValue(anchor1.shapeCount, anchor2.shapeCount, fraction)
  );
  const backgroundColor = interpolateHexColor(
    anchor1.backgroundColor,
    anchor2.backgroundColor,
    fraction
  );
  const shapeColors = anchor1.shapeColors.map((c1, idx) =>
    interpolateHexColor(c1, anchor2.shapeColors[idx], fraction)
  );

  return { shapeCount, shapeColors, backgroundColor };
};

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const dateFromDayOfYear = (year, day) => {
  const date = new Date(year, 0);
  date.setDate(day);
  return date;
};

export default function SeasonalAbstracts() {
  const [shapes, setShapes] = useState([]);
  const [dayOfYear, setDayOfYear] = useState(() => getDayOfYear(new Date()));
  const [showSlider, setShowSlider] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(
    SEASONAL_ANCHORS[0].backgroundColor
  );

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const testDate = dateFromDayOfYear(currentYear, dayOfYear);
    const { shapeCount, shapeColors, backgroundColor } =
      getSeasonalAttributes(testDate);

    const generatedShapes = Array.from({ length: shapeCount }, (_, index) => {
      const color = shapeColors[index % shapeColors.length];
      const size = getRandomInt(250, 400);
      const xPos = getRandomInt(-50, 90);
      const yPos = getRandomInt(-50, 90);
      const borderRadius = `${getRandomInt(50, 70)}%`;

      return {
        color,
        size,
        xPos,
        yPos,
        borderRadius
      };
    });

    setShapes(generatedShapes);
    setBackgroundColor(backgroundColor);
  }, [dayOfYear]);

  const dateLabel = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const sliderDate = dateFromDayOfYear(currentYear, dayOfYear);
    return sliderDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }, [dayOfYear]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor }}
    >
      {shapes.map((shape, index) => (
        <div
          key={index}
          className="absolute opacity-30 mix-blend-multiply"
          style={{
            width: shape.size,
            height: shape.size,
            backgroundColor: shape.color,
            borderRadius: shape.borderRadius,
            top: `${shape.yPos}%`,
            left: `${shape.xPos}%`,
            transform: `translate(-${shape.xPos}%, -${shape.yPos}%)`,
            filter: "blur(40px)"
          }}
        />
      ))}

      <div className="absolute bottom-0 left-0 w-full bg-white/60 p-3 text-stone-700 backdrop-blur-sm sm:p-4">
        <label className="mr-4 text-sm">
          <input
            type="checkbox"
            className="mr-2 align-middle"
            checked={showSlider}
            onChange={(event) => setShowSlider(event.target.checked)}
          />
          Show date slider
        </label>
        {showSlider ? (
          <div className="mt-2 flex flex-col items-center gap-1">
            <input
              type="range"
              min="1"
              max="365"
              value={dayOfYear}
              onChange={(event) => setDayOfYear(Number(event.target.value))}
            />
            <span className="text-xs">{dateLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
