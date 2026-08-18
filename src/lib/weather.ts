export interface WeatherData {
  temp: number
  feelsLike: number
  description: string
  icon: string
  humidity: number
  windSpeed: number
  code: number
}

export async function fetchWeather(): Promise<WeatherData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no-geolocation'))
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,apparent_temperature,weathercode,relative_humidity_2m,wind_speed_10m&timezone=auto`
          )
          if (!res.ok) throw new Error('fetch-failed')
          const data = await res.json()
          const c = data.current
          const code: number = c.weathercode
          resolve({
            temp: Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            description: wmoDescription(code),
            icon: wmoIcon(code),
            humidity: Math.round(c.relative_humidity_2m),
            windSpeed: Math.round(c.wind_speed_10m),
            code,
          })
        } catch (err) {
          reject(err)
        }
      },
      reject,
      { timeout: 8000 }
    )
  })
}

function wmoDescription(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 49) return 'Fog'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  return 'Thunderstorm'
}

function wmoIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '⛅'
  if (code === 3) return '☁️'
  if (code <= 49) return '🌫️'
  if (code <= 69) return '🌧️'
  if (code <= 79) return '❄️'
  if (code <= 82) return '🌦️'
  if (code <= 86) return '🌨️'
  return '⛈️'
}

export function weatherStyleHint(weather: WeatherData): string {
  if (weather.temp < 5) return 'Bundle up — wear your warmest layers today.'
  if (weather.temp < 12) return 'It\'s chilly — add a jacket or cardigan.'
  if (weather.temp < 18) return 'Light layer recommended for today\'s weather.'
  if (weather.temp < 24) return 'Perfect weather for most outfits!'
  if (weather.temp < 30) return 'Keep it light and breathable today.'
  return 'Hot day — go minimal and breathable.'
}
