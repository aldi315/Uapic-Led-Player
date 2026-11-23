/**
 * Weather data via Open-Meteo (https://open-meteo.com) — free, no API key.
 * Location can be a city name ("Jakarta") or coordinates ("-6.2,106.8").
 * Results are cached so several widgets / the editor preview share requests.
 */

const CACHE_MS = 10 * 60 * 1000
const cache = new Map() // key → { time, promise }

const WMO = {
  0: ['Clear', '☀️', '🌙'],
  1: ['Mostly clear', '🌤️', '🌙'],
  2: ['Partly cloudy', '⛅', '☁️'],
  3: ['Overcast', '☁️', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'], 57: ['Freezing drizzle', '🌧️'],
  61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'],
  71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'],
  80: ['Showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Violent showers', '⛈️'],
  85: ['Snow showers', '🌨️'], 86: ['Snow showers', '🌨️'],
  95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm, hail', '⛈️'], 99: ['Thunderstorm, hail', '⛈️'],
}

export function describeWeather(code, isDay = true) {
  const entry = WMO[code] || ['—', '🌡️']
  const icon = !isDay && entry[2] ? entry[2] : entry[1]
  return { label: entry[0], icon }
}

async function getJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function resolveLocation(location) {
  const text = String(location || '').trim()
  const coords = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (coords) return { latitude: Number(coords[1]), longitude: Number(coords[2]), place: text }
  if (!text) throw new Error('No location')
  const data = await getJSON(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=1&format=json`
  )
  const hit = data?.results?.[0]
  if (!hit) throw new Error(`Location "${text}" not found`)
  return { latitude: hit.latitude, longitude: hit.longitude, place: hit.name }
}

async function load(location, unit) {
  const loc = await resolveLocation(location)
  const params = new URLSearchParams({
    latitude: loc.latitude,
    longitude: loc.longitude,
    current: 'temperature_2m,relative_humidity_2m,weather_code,is_day,wind_speed_10m',
    temperature_unit: unit === 'F' ? 'fahrenheit' : 'celsius',
    timezone: 'auto',
  })
  const data = await getJSON(`https://api.open-meteo.com/v1/forecast?${params}`)
  const c = data?.current
  if (!c) throw new Error('No weather data')
  return {
    place: loc.place,
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    code: c.weather_code,
    isDay: c.is_day !== 0,
    wind: c.wind_speed_10m,
    time: c.time,
  }
}

export function fetchWeather(location, unit = 'C') {
  const key = `${String(location).trim().toLowerCase()}|${unit}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.time < CACHE_MS) return hit.promise
  const promise = load(location, unit)
  cache.set(key, { time: Date.now(), promise })
  promise.catch(() => cache.delete(key)) // retry next time on failure
  return promise
}
