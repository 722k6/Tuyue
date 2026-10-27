import {
  ElAlert,
  ElAside,
  ElButton,
  ElCard,
  ElContainer,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElHeader,
  ElInput,
  ElMain,
  ElMenu,
  ElMenuItem,
  ElOption,
  ElSelect,
} from 'element-plus';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './style.css';

const app = createApp(App).use(createPinia()).use(router);
[
  ElAlert, ElAside, ElButton, ElCard, ElContainer, ElEmpty, ElForm, ElFormItem,
  ElHeader, ElInput, ElMain, ElMenu, ElMenuItem, ElOption, ElSelect,
].forEach((component) => app.component(component.name!, component));
app.mount('#app');
