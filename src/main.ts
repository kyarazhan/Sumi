import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

import "./styles/theme.css";
import "./styles/base.css";
import "./styles/viewer.css";
import "./styles/print.css";
import "katex/dist/katex.min.css";

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
