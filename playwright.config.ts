import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',timeout:120000,expect:{timeout:12000},use:{baseURL:'http://127.0.0.1:4179',acceptDownloads:true},webServer:{command:'npm run dev -- --port 4179 --strictPort',url:'http://127.0.0.1:4179',reuseExistingServer:!process.env.CI,timeout:45000}});
