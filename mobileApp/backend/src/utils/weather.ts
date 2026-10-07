// backend/src/utils/weather.ts
import axios from 'axios';
import { logger } from './logger';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

export const getWeather = async (city: string): Promise<string> => {
    try {
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather`,
            {
                params: {
                    q: city,
                    appid: OPENWEATHER_API_KEY,
                    units: 'metric',
                    lang: 'de',
                },
            }
        );

        const weather = response.data;
        const description = weather.weather[0].description;
        const temp = weather.main.temp;

        return `${city}: ${description}, ${temp} °C 🌤️`;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Wetterabfrage fehlgeschlagen: ${errorMsg}`);
        return 'Wetterdaten derzeit nicht verfügbar.';
    }
};