<script setup>
import { computed, onMounted, reactive, ref, watch, watchEffect } from "vue";

import axios from 'axios'


const publicEnvVar = import.meta.env.VITE_WEATHER;
const responsewithweather = ref([]);
const generalMood = ref('');

const prop = defineProps({
    resourse: Array,
    options: Object
})

const emit = defineEmits([
    'option-click', 
    'weather-mood',
    'user-selected'
])

const optionChange = (u) => {
    emit('option-click', prop.options.modelValue = true)
    emit('user-selected', u)
}

const computedWeather = computed({
    get() {
        return generalMood
    },
    set(str) {
        generalMood.value = str
    }
})

const fetchWeatherForEachUserData = async (lat, lon, u) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${publicEnvVar}&units=metric`;
    return await axios.get(url).then(response => {
        let objectDataCollection = reactive({
            u,
            userWeather: response.data,
            icon: `https://openweathermap.org/img/w/${response.data.weather[0].icon}.png`,
            bigicon: `https://openweathermap.org/img/wn/${response.data.weather[0].icon}@4x.png`,
        })
        responsewithweather.value.push(objectDataCollection)
    });
}

const mode = (arr) => {
    const count = arr
        .reduce((r, { bigicon }) => {
            r[bigicon] = r[bigicon] || { bigicon, occurences: 0 };
            r[bigicon].occurences++;
            return r;
        }, {})

    const topOccurence = Object
        .values(count)
        .sort((a, b) => b.occurences - a.occurences)
        .slice(0, 1);

    const max = topOccurence[0].bigicon

    return max;
}

onMounted(() => {
    responsewithweather.value = []
    prop.resourse.forEach(el => {
        fetchWeatherForEachUserData(el.latitude, el.longitude, el)
    });
})

watchEffect(() => {
    if (responsewithweather.value.length) {
        let data = mode(responsewithweather.value)

        if (data) {
            computedWeather.value = data
            emit('weather-mood', computedWeather.value)
        }
    }
})
// src={`http://openweathermap.org/img/wn/${a.weather[0].icon}@2x.png`}
// url - https://openweathermap.org/img/wn/${icon_id}@4x.png 
// The URL is https://openweathermap.org/img/w/${icon_id}.png
</script>
<template>
    <div class="grid grid-cols-4 gap-4" v-if="responsewithweather">
        <div class="grid grid-cols-3 rounded-lg gap-x-2 rounded-ml bg-slate-50" v-for="user in responsewithweather"
            :key="user.u.id">
            <div class="bg-amber-200">
                <img :src="user.icon" class="mx-auto" alt="">
            </div>
            <div class="col-span-2 my-auto">
                <p class="px-2 text-sm font-thin cursor-pointer" @click="optionChange(user.u)">{{ user.u.name }}</p>
            </div>
        </div>
    </div>
</template>