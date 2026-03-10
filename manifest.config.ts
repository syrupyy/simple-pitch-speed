import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Simple Pitch/Speed Changer",
  version: pkg.version,
  description: "Change the pitch and speed of media elements on web pages.",
  icons: {
    16: "public/icon16.png",
    48: "public/icon48.png",
    128: "public/icon128.png",
  },
  action: {
    default_icon: {
      16: "public/icon16.png",
      48: "public/icon48.png",
      128: "public/icon128.png",
    },
    default_popup: "src/popup/index.html",
  },
  background: {
    service_worker: "src/background/main.ts",
    type: "module",
  },
  permissions: ["storage", "activeTab", "scripting"],
});
