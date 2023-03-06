import { createApp } from "vue";
import { createPinia } from "pinia";
import { createVfm } from 'vue-final-modal'
import App from "./App.vue";
import router from "./router";

import "./assets/main.css";
import 'vue-final-modal/style.css'

const app = createApp(App);
const vfm = createVfm()

app.use(createPinia());
app.use(vfm);

app.use(router);

app.mount("#app");
