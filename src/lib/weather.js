const DEBUG = {
  hot: { temp: 36, feels: 38, rain: 5, text: "Hot (preview)" },
  cold: { temp: 12, feels: 10, rain: 10, text: "Cold (preview)" },
  rain: { temp: 24, feels: 24, rain: 80, text: "Rain (preview)" },
};

export async function searchCities(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("City search failed.");
  const payload = await response.json();
  return (payload.results || []).map((city) => ({
    label: [city.name, city.admin1, city.country].filter(Boolean).join(", "),
    lat: city.latitude,
    lon: city.longitude,
  }));
}

export async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation_probability,weather_code`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather is unavailable.");
  const payload = await response.json();
  const current = payload.current || {};
  return {
    temp: current.temperature_2m,
    feels: current.apparent_temperature,
    rain: current.precipitation_probability ?? 0,
    code: current.weather_code,
    at: Date.now(),
    text: describe(current.weather_code, current.temperature_2m),
  };
}

function describe(code, temp) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 80) return "Showers";
  if (code >= 71) return "Snow";
  if (temp >= 32) return "Hot";
  return "Mild";
}

export function weatherFor(settings, online) {
  if (settings.debugWeather && settings.debugWeather !== "off" && DEBUG[settings.debugWeather]) {
    return { ...DEBUG[settings.debugWeather], offline: false, debug: true };
  }
  if (settings.weatherCache) {
    return { ...settings.weatherCache, offline: !online };
  }
  return { temp: 28, feels: 28, rain: 10, text: "Mild day until you set a city", offline: !online, placeholder: true };
}

export function readPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This phone has no location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => reject(new Error("Location permission was blocked.")),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  });
}
