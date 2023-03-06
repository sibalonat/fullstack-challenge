<script setup>

import { computed, onBeforeMount, onMounted, ref } from "vue";

import { ModalsContainer, VueFinalModal } from 'vue-final-modal'
import axios from 'axios'
import GridComponent from "./GridComponent.vue";
import LoadingSpinner from "./LoadingSpinner.vue";
import VueWeather from "./WeatherWidget.vue";

const apiResponse = ref(null);
const responsewithweather = ref([]);
const weatherIcon = ref([]);
const userFromClick = ref(null);

const publicEnvVar = import.meta.env.VITE_WEATHER;

onBeforeMount(() => {
  fetchData()
})

const fetchData = async () => {
  const url = "http://localhost/";
  apiResponse.value = await (await fetch(url)).json();
};


const getInitialValues = () => ({
  teleportTo: 'body',
  modelValue: false,
  displayDirective: 'if',
  hideOverlay: false,
  overlayTransition: 'vfm-fade',
  contentTransition: 'vfm-fade',
  clickToClose: true,
  escToClose: true,
  background: 'non-interactive',
  lockScroll: true,
  swipeToClose: 'none',
})

const options = ref(getInitialValues())

const userSelected = computed({
  get() {
    return userFromClick.value
  },
  set(obj) {
    userFromClick.value = obj
  }
})

const reset = () => {
  options.value = getInitialValues()
}

const optionsValueChange = (e) => {
  // console.log(e);
}

const moodIcon = (e) => {
  weatherIcon.value = e.value
}

const userSelect = (u) => {
  userSelected.value = u
}


</script>

<template>
  <div class="w-full bg-stone-200">
    <div class="flex items-center h-screen mx-auto" v-if="!apiResponse">
      <LoadingSpinner />
    </div>
    <div class="container flex items-center h-screen pt-20 mx-auto" v-if="apiResponse">
      <div class="grid grid-cols-4 gap-x-4" v-if="weatherIcon">
        <div
          class="w-full h-full rounded-lg backdrop-blur-sm drop-shadow-xl saturate-200 bg-slate-50 bg-blend-color-dodge">
          <p class="w-5/6 mx-auto mt-3 font-sans text-sm antialiased italic">
            The mode for our users weather is:
          </p>
          <img v-if="weatherIcon" class="flex w-4/5 mx-auto drop-shadow-xl mix-blend-multiply" :src="weatherIcon" alt="">

        </div>
        <div class="col-span-3">
          <GridComponent @option-click="optionsValueChange" :resourse="apiResponse.users" :options="options"
            @weather-mood="moodIcon" @user-selected="userSelect" />
        </div>

      </div>
    </div>
    <VueFinalModal v-model="options.modelValue" :teleport-to="options.teleportTo"
      :display-directive="options.displayDirective" :hide-overlay="options.hideOverlay"
      :overlay-transition="options.overlayTransition" :content-transition="options.contentTransition"
      :click-to-close="options.clickToClose" :esc-to-close="options.escToClose" :background="options.background"
      :lock-scroll="options.lockScroll" :swipe-to-close="options.swipeToClose" class="flex items-center justify-center"
      content-class="max-w-[60%] w-full p-4 mx-4 space-y-2 bg-white border rounded-lg dark:bg-gray-900 dark:border-gray-700">
      <h1 class="text-sm italic">
        Hello <span class="ml-2 text-xl not-italic"> {{ userSelected.name }} </span>
      </h1>
      <div class="flex w-full">
        <VueWeather :api-key="publicEnvVar" units="uk" :latitude="userSelected.latitude" :longitude="userSelected.longitude" />
      </div>
      <button @click="options.modelValue = false">
        Close
      </button>
    </VueFinalModal>
    <ModalsContainer />
  </div>
</template>
