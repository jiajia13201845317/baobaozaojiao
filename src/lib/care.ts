export type SkyKind = "sun" | "cloud" | "rain" | "night";
export type DressKind = "tee" | "cardigan" | "coat";
export type MealKind = "milk" | "fruit" | "meal";

export type CareInfo = {
  sky: SkyKind;
  temp: number;
  weatherLine: string;
  dressKind: DressKind;
  dressLine: string;
  mealKind: MealKind;
  mealLine: string;
  speakWeather: string;
  speakDress: string;
  speakMeal: string;
};

const CACHE_KEY = "bao-care";
const DEFAULT_PLACE = { lat: 31.23, lon: 121.47 };

export function fallbackCare(now = new Date(), night = false): CareInfo {
  const month = now.getMonth();
  const hour = now.getHours();
  const summer = month >= 5 && month <= 8;
  const winter = month <= 1 || month >= 11;
  const temp = winter ? 9 : summer ? (hour >= 11 && hour <= 16 ? 31 : 26) : 19;
  const sky: SkyKind = night || hour >= 19 || hour < 6 ? "night" : summer ? "sun" : winter ? "cloud" : "sun";
  return buildCare(sky, temp, hour, night);
}

export function buildCare(sky: SkyKind, temp: number, hour: number, night: boolean): CareInfo {
  const skyNow: SkyKind = night || hour >= 19 || hour < 6 ? (sky === "rain" ? "rain" : "night") : sky;
  const weatherLine =
    skyNow === "rain"
      ? "下雨啦"
      : skyNow === "night"
        ? "月亮出来了"
        : skyNow === "cloud"
          ? "天上有云"
          : "太阳出来啦";
  const speakWeather =
    skyNow === "rain"
      ? `下雨啦，现在${temp}度，宝宝在家里听`
      : skyNow === "night"
        ? `月亮看着你，现在${temp}度`
        : skyNow === "cloud"
          ? `天上有云，现在${temp}度`
          : `太阳出来啦，现在${temp}度`;

  let dressKind: DressKind = "cardigan";
  let dressLine = "加一件小外套";
  let speakDress = "今天外面加一件小外套";
  if (temp >= 28) {
    dressKind = "tee";
    dressLine = "穿短袖就好";
    speakDress = "今天热，穿短袖就好，出汗要擦一擦";
  } else if (temp >= 22) {
    dressKind = "tee";
    dressLine = "一件薄衣服";
    speakDress = "今天暖和，一件薄衣服就够了";
  } else if (temp >= 16) {
    dressKind = "cardigan";
    dressLine = "加一件小外套";
    speakDress = "今天有点凉，出门加一件小外套";
  } else {
    dressKind = "coat";
    dressLine = "帽子和外套";
    speakDress = "今天冷，帽子和外套都要穿上";
  }

  let mealKind: MealKind = "meal";
  let mealLine = "吃饭啦";
  let speakMeal = "宝宝，吃饭啦";
  if (hour < 7 || hour >= 20) {
    mealKind = "milk";
    mealLine = "该喝奶啦";
    speakMeal = hour >= 20 ? "睡前喝一口奶，然后要睡觉了" : "宝宝，该喝奶啦";
  } else if (hour < 9) {
    mealKind = "milk";
    mealLine = "吃早饭啦";
    speakMeal = "早上了，先喝奶，再吃一点粥";
  } else if (hour < 11) {
    mealKind = "fruit";
    mealLine = "吃点小水果";
    speakMeal = "来，吃一点小水果";
  } else if (hour < 14) {
    mealKind = "meal";
    mealLine = "吃午饭啦";
    speakMeal = "中午到了，吃饭啦";
  } else if (hour < 17) {
    mealKind = "fruit";
    mealLine = "喝口水";
    speakMeal = "先喝口水，还可以吃点小点心";
  } else {
    mealKind = "meal";
    mealLine = "吃晚饭啦";
    speakMeal = "晚上了，吃饭啦";
  }

  return {
    sky: skyNow,
    temp,
    weatherLine,
    dressKind,
    dressLine,
    mealKind,
    mealLine,
    speakWeather,
    speakDress,
    speakMeal,
  };
}

function skyFromCode(code: number): SkyKind {
  if (code === 0 || code === 1) return "sun";
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return "rain";
  return "cloud";
}

export async function loadCare(night: boolean): Promise<CareInfo> {
  const hour = new Date().getHours();
  try {
    const forced = new URLSearchParams(window.location.search).get("weather");
    if (forced === "sun" || forced === "cloud" || forced === "rain" || forced === "night") {
      const temp = forced === "rain" ? 16 : forced === "night" ? 12 : forced === "cloud" ? 20 : 27;
      return buildCare(forced, temp, hour, night || forced === "night");
    }

    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { at: number; temp: number; sky: SkyKind };
      if (Date.now() - parsed.at < 30 * 60 * 1000) {
        return buildCare(parsed.sky, parsed.temp, hour, night);
      }
    }
  } catch {
    /* ignore */
  }

  const place = await readPlace();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather");
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const temp = Math.round(data.current?.temperature_2m ?? 22);
    const sky = skyFromCode(data.current?.weather_code ?? 1);
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), temp, sky }));
    } catch {
      /* ignore */
    }
    return buildCare(sky, temp, hour, night);
  } catch {
    return fallbackCare(new Date(), night);
  }
}

function readPlace(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_PLACE);
      return;
    }
    const timer = window.setTimeout(() => resolve(DEFAULT_PLACE), 2500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        window.clearTimeout(timer);
        resolve(DEFAULT_PLACE);
      },
      { timeout: 2200, maximumAge: 30 * 60 * 1000 }
    );
  });
}
