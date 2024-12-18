// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { loadEnv } from "@prosopo/dotenv";
import { defineConfig } from "cypress";
import vitePreprocessor from "cypress-vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

loadEnv();

export default defineConfig({
	video: true,
	headers: { "Accept-Encoding": "gzip, deflate" },
	env: {
		...process.env,
		default_page: "/",
	},
	e2e: {
		setupNodeEvents(on, config) {
			on(
				"file:preprocessor",
				vitePreprocessor({
					watch: false,
					esbuild: {
						platform: "browser",
					},
					server: {
						host: true,
					},
					build: {
						ssr: false,
						modulePreload: { polyfill: true },
						mode: "development",
					},
					plugins: [
						nodePolyfills({
							// Whether to polyfill `node:` protocol imports.
							protocolImports: true,
						}),
					],
				}),
			);
		},
	},
	component: {
		devServer: {
			framework: "create-react-app",
			bundler: "vite",
		},
	},
});
