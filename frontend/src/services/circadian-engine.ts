export type CircadianPhase = "day" | "night";

export interface CircadianCity {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface CircadianPlan {
  city: CircadianCity;
  sunrise: Date;
  sunset: Date;
  mealWindowStart: Date;
  mealWindowEnd: Date;
  screenOffAt: Date;
  nextAnchor: Date;
  nextAnchorLabel: string;
  phase: CircadianPhase;
  daylightProgress: number;
  daylightHours: number;
}

export const CIRCADIAN_CITIES: CircadianCity[] = [
  {
    id: "mexico-city",
    name: "Ciudad de Mexico",
    country: "Mexico",
    latitude: 19.4326,
    longitude: -99.1332,
    timeZone: "America/Mexico_City",
  },
  {
    id: "bogota",
    name: "Bogota",
    country: "Colombia",
    latitude: 4.711,
    longitude: -74.0721,
    timeZone: "America/Bogota",
  },
  {
    id: "porlamar",
    name: "Porlamar",
    country: "Venezuela",
    latitude: 10.957,
    longitude: -63.8491,
    timeZone: "America/Caracas",
  },
];

const OFFICIAL_ZENITH = 90.833;
const MINUTES_AFTER_SUNRISE_TO_EAT = 60;
const MINUTES_BEFORE_SUNSET_TO_CLOSE_FOOD = 180;
const MINUTES_AFTER_SUNSET_TO_STOP_SCREENS = 90;

export function createCircadianPlan(city: CircadianCity, now = new Date()): CircadianPlan {
  const today = getDatePartsInTimeZone(now, city.timeZone);
  const tomorrow = addDaysToDateParts(today, 1);
  const sunrise = calculateSunEvent(today, city.latitude, city.longitude, "sunrise");
  const sunset = calculateSunEvent(today, city.latitude, city.longitude, "sunset");
  const tomorrowSunrise = calculateSunEvent(
    tomorrow,
    city.latitude,
    city.longitude,
    "sunrise",
  );

  const mealWindowStart = addMinutes(sunrise, MINUTES_AFTER_SUNRISE_TO_EAT);
  let mealWindowEnd = addMinutes(sunset, -MINUTES_BEFORE_SUNSET_TO_CLOSE_FOOD);

  if (mealWindowEnd <= mealWindowStart) {
    mealWindowEnd = addMinutes(sunset, -60);
  }

  const screenOffAt = addMinutes(sunset, MINUTES_AFTER_SUNSET_TO_STOP_SCREENS);
  const phase: CircadianPhase = now >= sunrise && now < sunset ? "day" : "night";
  const daylightProgress = clamp(
    (now.getTime() - sunrise.getTime()) / (sunset.getTime() - sunrise.getTime()),
    0,
    1,
  );

  const { nextAnchor, nextAnchorLabel } = getNextAnchor({
    now,
    sunrise,
    mealWindowStart,
    mealWindowEnd,
    sunset,
    screenOffAt,
    tomorrowSunrise,
  });

  return {
    city,
    sunrise,
    sunset,
    mealWindowStart,
    mealWindowEnd,
    screenOffAt,
    nextAnchor,
    nextAnchorLabel,
    phase,
    daylightProgress,
    daylightHours: (sunset.getTime() - sunrise.getTime()) / 36e5,
  };
}

export function findNearestCircadianCity(coords: {
  latitude: number;
  longitude: number;
}): CircadianCity {
  return CIRCADIAN_CITIES.reduce((nearest, city) => {
    const nearestDistance = getDistanceKm(coords, nearest);
    const cityDistance = getDistanceKm(coords, city);
    return cityDistance < nearestDistance ? city : nearest;
  }, CIRCADIAN_CITIES[0]);
}

export function formatCircadianTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(date);
}

function getNextAnchor(params: {
  now: Date;
  sunrise: Date;
  mealWindowStart: Date;
  mealWindowEnd: Date;
  sunset: Date;
  screenOffAt: Date;
  tomorrowSunrise: Date;
}): { nextAnchor: Date; nextAnchorLabel: string } {
  if (params.now < params.sunrise) {
    return {
      nextAnchor: params.sunrise,
      nextAnchorLabel: "Busca luz solar al despertar",
    };
  }

  if (params.now < params.mealWindowStart) {
    return {
      nextAnchor: params.mealWindowStart,
      nextAnchorLabel: "Primera comida ideal",
    };
  }

  if (params.now < params.mealWindowEnd) {
    return {
      nextAnchor: params.mealWindowEnd,
      nextAnchorLabel: "Cierre ideal de comida",
    };
  }

  if (params.now < params.sunset) {
    return {
      nextAnchor: params.sunset,
      nextAnchorLabel: "Baja intensidad antes del atardecer",
    };
  }

  if (params.now < params.screenOffAt) {
    return {
      nextAnchor: params.screenOffAt,
      nextAnchorLabel: "Corte recomendado de pantallas",
    };
  }

  return {
    nextAnchor: params.tomorrowSunrise,
    nextAnchorLabel: "Modo noche hasta la siguiente luz natural",
  };
}

function calculateSunEvent(
  dateParts: { year: number; month: number; day: number },
  latitude: number,
  longitude: number,
  event: "sunrise" | "sunset",
): Date {
  const dayOfYear = getDayOfYear(dateParts);
  const longitudeHour = longitude / 15;
  const approximateTime =
    event === "sunrise"
      ? dayOfYear + (6 - longitudeHour) / 24
      : dayOfYear + (18 - longitudeHour) / 24;
  const meanAnomaly = 0.9856 * approximateTime - 3.289;
  const trueLongitude = normalizeDegrees(
    meanAnomaly +
      1.916 * Math.sin(toRadians(meanAnomaly)) +
      0.02 * Math.sin(toRadians(2 * meanAnomaly)) +
      282.634,
  );

  let rightAscension = toDegrees(
    Math.atan(0.91764 * Math.tan(toRadians(trueLongitude))),
  );
  rightAscension = normalizeDegrees(rightAscension);
  rightAscension +=
    Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;

  const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosLocalHourAngle =
    (Math.cos(toRadians(OFFICIAL_ZENITH)) -
      sinDeclination * Math.sin(toRadians(latitude))) /
    (cosDeclination * Math.cos(toRadians(latitude)));

  const normalizedLocalHourAngle = clamp(cosLocalHourAngle, -1, 1);
  const localHourAngle =
    event === "sunrise"
      ? 360 - toDegrees(Math.acos(normalizedLocalHourAngle))
      : toDegrees(Math.acos(normalizedLocalHourAngle));
  const localHour = localHourAngle / 15;
  const localMeanTime =
    localHour + rightAscension - 0.06571 * approximateTime - 6.622;
  const universalTime = normalizeHours(localMeanTime - longitudeHour);

  return createUtcDateFromDecimalHours(dateParts, universalTime);
}

function createUtcDateFromDecimalHours(
  dateParts: { year: number; month: number; day: number },
  decimalHours: number,
): Date {
  const hours = Math.floor(decimalHours);
  const minutesFloat = (decimalHours - hours) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);

  return new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hours, minutes, seconds),
  );
}

function getDatePartsInTimeZone(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone,
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function addDaysToDateParts(
  dateParts: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + days));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function getDayOfYear(dateParts: { year: number; month: number; day: number }): number {
  const date = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day);
  const yearStart = Date.UTC(dateParts.year, 0, 0);
  return Math.floor((date - yearStart) / 86400000);
}

function getDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeHours(value: number): number {
  return ((value % 24) + 24) % 24;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
