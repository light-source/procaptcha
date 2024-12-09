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
class WebComponent {
	public addToElement(element: Element): ShadowRoot {
		const webComponent = this.makeWebComponent();
		const shadowRoot = this.addShadowDom(webComponent);

		element.appendChild(webComponent);

		return shadowRoot;
	}

	protected makeWebComponent(): HTMLElement {
		return document.createElement("prosopo-procaptcha");
	}

	protected getBaseShadowStyles(): string {
		// todo maybe introduce customCSS in renderOptions.
		const customCss = "";

		let baseStyles =
			'<style>:host{all:initial!important;}:host *{font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";}</style>';
		baseStyles += "" !== customCss ? `<style>${customCss}</style>` : "";

		return baseStyles;
	}

	protected addShadowDom(webComponent: HTMLElement): ShadowRoot {
		// fixme check if shadowRoot is already attached.
		const shadowRoot = webComponent.attachShadow({ mode: "open" });

		shadowRoot.innerHTML += this.getBaseShadowStyles();

		return shadowRoot;
	}
}

export { WebComponent };
