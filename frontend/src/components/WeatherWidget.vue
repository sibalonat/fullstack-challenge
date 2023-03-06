<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import Skycon from "vue-skycon";
const IP_CACHE = "vww__cache_ip";
const IP_LOCATION_CACHE = "vww__cache_ip_location";
const GEOCODE_CACHE = "vww__cache_geocode";


//datas
const ICON_MAPPINGS = {
    "clear-day": ["01d"],
    "clear-night": ["01n"],
    cloudy: ["03d", "03n"],
    fog: ["50d", "50n"],
    "partly-cloudy-day": ["02d", "04d"],
    "partly-cloudy-night": ["02n", "04n"],
    rain: ["09d", "09n", "10d", "10n", "11d", "11n"],
    sleet: ["13d", "13n"],
    snow: ["13d", "13n"],
    wind: ["50d", "50n"],
};

const UNIT_MAPPINGS = {
    auto: "standard",
    us: "imperial",
    uk: "metric",
};

const loading = ref(true)
const weather = ref(null)
const error = ref(null)
const timeout = ref(null)
const publicEnvVar = import.meta.env.VITE_WEATHER;

// props
const prop = defineProps({
    apiKey: {
        type: String,
        required: true
    },
    latitude: {
        type: String,
    },
    longitude: {
        type: String,
    },
    language: {
        type: String,
        default: "en",
    },
    units: {
        type: String,
        default: "us",
    },
    hideHeader: {
        type: Boolean,
        default: false,
    },
    updateInterval: {
        type: Number,
    },
    disableAnimation: {
        type: Boolean,
        default: false,
    },
    barColor: {
        type: String,
        default: "#444",
    },
    textColor: {
        type: String,
        default: "#333",
    },
    ipregistryKey: {
        type: String,
        default: "f8n4kqe8pv4kii",
    },
})

// methods

const lookupIP = async () => {
    let cache = localStorage[IP_CACHE] || "{}";
    cache = JSON.parse(cache);
    if (cache.ip) {
        return Promise.resolve(cache);
    }

    const resp = await fetch("https://www.cloudflare.com/cdn-cgi/trace");
    const text_1 = await resp.text();
    const data = text_1.split("\n")
        .map((l) => l.split("="))
        .filter((x) => x.length == 2)
        .reduce((o, x_1) => {
            o[x_1[0].trim()] = x_1[1].trim();
            return o;
        }, {});
    localStorage[IP_CACHE] = JSON.stringify(data);
    return data;
}

const fetchLocationByIP = (apiKey, ip) => {
    if (!ip) {
        return lookupIP().then((data) => {
            return fetchLocationByIP(apiKey, data["ip"]);
        });
    }

    let cache = localStorage[IP_LOCATION_CACHE] || "{}";
    cache = JSON.parse(cache);
    if (cache[ip]) {
        return cache[ip];
    }

    apiKey = apiKey || "4yim0jem7t7ru7bx";
    return fetch(`https://api.ipregistry.co/${ip}?key=${apiKey}`)
        .then((resp) => resp.json())
        .then((result) => {
            cache[ip] = result.location || {};
            localStorage[IP_LOCATION_CACHE] = JSON.stringify(cache);
            return cache[ip];
        });
}

const geocode = async (apiKey, query, reversed = false) => {
    let cache = localStorage[GEOCODE_CACHE] || "{}";
    cache = JSON.parse(cache);
    if (cache[query]) {
        return Promise.resolve(cache[query]);
    }

    apiKey = apiKey || "c3bb8aa0a56b21122dea6a2a8ada70c8";
    const apiType = reversed ? "reverse" : "forward";
    const resp = await fetch(`//api.positionstack.com/v1/${apiType}?access_key=${apiKey}&query=${query}`);
    const result_1 = await resp.json();
    if (result_1.error) {
        throw new Error("(api.positionstack.com) " + result_1.error.message);
    }
    cache[query] = result_1.data[0];
    localStorage[GEOCODE_CACHE] = JSON.stringify(cache);
    return cache[query];
    // latitude, longitude, region, country
}

const reverseGeocode = (apiKey, lat, lng) => {
    return geocode(apiKey, `${lat},${lng}`, true);
}


const fetchOWMWeather = async (opts = {}) => {
    opts.units = opts.units || "auto";
    opts.language = opts.language || "en";

    if (!opts.lat || !opts.lng) {
        throw new Error("Geolocation is required");
    }

    const units = UNIT_MAPPINGS[opts.units] || "standard";

    const resp = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?appid=${publicEnvVar}&lat=${opts.lat}&lon=${opts.lng}&units=${units}&lang=${opts.language}`
    );
    const data = await resp.json();
    return mapData(data);
}

const mapData = (data) => {
    const {current} = data;
    // console.log(data);
    const { weather } = current;
    console.log(weather);
    const [currentWeather] = weather;
    const { description, icon } = currentWeather;
    const iconName = mapIcon(icon);
    // console.log(iconName);

    return {
        currently: Object.assign({}, current, {
            icon: iconName,
            temperature: current.temp,
            summary: description,
            windSpeed: current.wind_speed,
            windBearing: current.wind_deg,
        }),
        daily: {
            data: data.daily.map((day) => {
                return {
                    temperatureMax: day.temp.max,
                    temperatureMin: day.temp.min,
                    time: day.dt,
                    icon: mapIcon(day.weather[0].icon),
                };
            }),
        },
        hourly: {
            data: data.hourly.map((hour) => {
                return {
                    temperature: hour.temp,
                };
            }),
        },
    };
}

const mapIcon = (code) => {
    return Object.keys(ICON_MAPPINGS).find((key) => {
        return ICON_MAPPINGS[key].includes(code);
    });
}

const loadWeather = async () => {
    const data = await fetchOWMWeather({
        apiKey: prop.apiKey,
        lat: prop.latitude,
        lng: prop.longitude,
        units: prop.units,
        language: prop.language,
    });
    console.log(data);
    weather.value = data
}

const autoupdate = () => {
    clearTimeout(timeout.value);
    const time = Number(prop.updateInterval);
    if (!time || time < 10 || onUnmounted) {
        return;
    }
    timeout.value = setTimeout(() => hydrate(false), time);
}

const hydrate = (setLoading = true) => {
    loading.value = setLoading
    return nextTick()
        .then(processLocation)
        .then(loadWeather)
        .then(() => {
            error.value = null
        })
        .catch((err) => {
            error.value = err
        })
        .finally(() => {
            loading.value = false
            autoupdate();
        });
}

const processLocation = () => {
    if (!prop.latitude || !prop.longitude) {
        throw new Error("VueWeatherWidget: Latitude or longitude is required");
    }
}



onMounted(() => {
    hydrate();
})

onUnmounted(() => {
    clearTimeout(timeout.value);
})

// computed 
const currently = computed(() => weather.value.currently)
const isDownward = computed(() => {
    const hourly = weather.value.hourly.data;
    const time = new Date().getTime() / 1e3;
    for (let i = 0; i < hourly.length; i++) {
        if (hourly[i].time <= time) continue;
        return hourly[i].temperature < currently.temperature;
    }
})
const windBearing = computed(() => {
    const t = Math.round(currently.windBearing / 45);
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"][t];
})
const daily = computed(() => {
    const forecasts = [];
    let globalMaxTemp = -Infinity;
    let globalMinTemp = Infinity;

    const tomorrow = new Date(new Date().toDateString());
    const today = tomorrow.getTime() / 1e3 + 24 * 3600 - 1;

    const daily = weather.value.daily.data;
    for (let i = 0; i < daily.length; i++) {
        const day = daily[i];
        if (day.temperatureMax > globalMaxTemp) {
            globalMaxTemp = day.temperatureMax;
        }
        if (day.temperatureMin < globalMinTemp) {
            globalMinTemp = day.temperatureMin;
        }
        forecasts.push(Object.assign({}, day));
    }

    const tempRange = globalMaxTemp - globalMinTemp;
    for (let i = 0; i < forecasts.length; ++i) {
        const day = forecasts[i];
        if (day.time <= today) {
            day.weekName = "Today";
        } else {
            day.weekName = new Date(day.time * 1000).toLocaleDateString(prop.language, {
                weekday: "short",
            });
        }
        const max = day.temperatureMax;
        const min = day.temperatureMin;
        day.height = Math.round((100 * (max - min)) / tempRange);
        day.top = Math.round((100 * (globalMaxTemp - max)) / tempRange);
        day.bottom = 100 - (day.top + day.height);
    }
    return forecasts;
})

</script>
<template>
    <div class="vww__widget" :style="{ color: textColor }">
        <slot name="header">
            <div class="vww__header" :style="{ borderColor: barColor }" v-if="!hideHeader">
                <span class="vww__title">
                    <slot name="title">Weather</slot>
                </span>
            </div>
        </slot>

        <div class="vww__content">
            <div class="vww__loading" v-if="loading">
                <slot name="loading">
                    <skycon condition="partly-cloudy-day" :color="textColor" :paused="disableAnimation" />
                    <span class="vww__title">Loading...</span>
                </slot>
            </div>

            <div class="vww__error" v-else-if="error || !weather || !currently || !daily">
                <slot name="error">
                    <skycon condition="rain" :color="textColor" :paused="disableAnimation" />
                    <span class="vww__title">{{ error || "Something went wrong!" }}</span>
                </slot>
            </div>

            <template v-else>
                <div class="vww__currently">
                    <div>
                        <skycon :condition="currently.icon" size="80" :color="textColor" :paused="disableAnimation" />
                        <div class="vww__temp">
                            {{ Math.round(currently.temperature) }}&deg;
                            <div v-if="isDownward">
                                <svg viewBox="0 0 306 306" width="24" height="24">
                                    <polygon points="270.3,58.65 153,175.95 35.7,58.65 0,94.35 153,247.35 306,94.35"
                                        :style="{ fill: textColor }" />
                                </svg>
                            </div>
                            <div v-else>
                                <svg viewBox="0 0 306 306" width="24" height="24">
                                    <polygon points="35.7,247.35 153,130.05 270.3,247.35 306,211.65 153,58.65 0,211.65"
                                        :style="{ fill: textColor }" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="vww__title">{{ currently.summary }}</div>
                    <div class="vww__wind">
                        Wind: {{ Math.round(currently.windSpeed) }} mph ({{ windBearing }})
                    </div>
                </div>

                <div class="vww__daily">
                    <div class="vww__day" :key="day.time" v-for="day in daily">
                        <span>{{ day.weekName }}</span>
                        <span>
                            <skycon style="display: block" :condition="day.icon" size="26" :color="textColor"
                                :paused="disableAnimation" />
                        </span>
                        <div class="vww__day-bar">
                            <div :style="{ height: `${day.top}%` }">
                                <span>{{ Math.round(day.temperatureMax) }}&deg;</span>
                            </div>
                            <div :style="{
                                borderRadius: '10px',
                                background: barColor,
                                height: `${day.height}%`,
                            }">
                                &nbsp;
                            </div>
                            <div :style="{ height: `${day.bottom}%` }">
                                <span>{{ Math.round(day.temperatureMin) }}&deg;</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>