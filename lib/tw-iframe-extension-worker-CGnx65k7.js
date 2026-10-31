import { i as __commonJSMin, n as require_webpack_loader_stub, r as require_uid } from "./react-Dy32m2qR.js";
// node_modules/scratch-vm/src/extension-support/tw-iframe-extension-worker.js
var require_tw_iframe_extension_worker = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var uid = require_uid();
	var frameSource = require_webpack_loader_stub();
	var none = "'none'";
	var featurePolicy = {
		"accelerometer": none,
		"ambient-light-sensor": none,
		"battery": none,
		"camera": none,
		"display-capture": none,
		"document-domain": none,
		"encrypted-media": none,
		"fullscreen": none,
		"geolocation": none,
		"gyroscope": none,
		"magnetometer": none,
		"microphone": none,
		"midi": none,
		"payment": none,
		"picture-in-picture": none,
		"publickey-credentials-get": none,
		"speaker-selection": none,
		"usb": none,
		"vibrate": none,
		"vr": none,
		"screen-wake-lock": none,
		"web-share": none,
		"interest-cohort": none
	};
	var generateAllow = () => Object.entries(featurePolicy).map(([name, permission]) => `${name} ${permission}`).join("; ");
	var IframeExtensionWorker = class {
		constructor() {
			this.id = uid();
			this.isRemote = true;
			this.ready = false;
			this.queuedMessages = [];
			this.iframe = document.createElement("iframe");
			this.iframe.className = "tw-custom-extension-frame";
			this.iframe.dataset.id = this.id;
			this.iframe.style.display = "none";
			this.iframe.setAttribute("aria-hidden", "true");
			this.iframe.sandbox = "allow-scripts";
			this.iframe.allow = generateAllow();
			document.body.appendChild(this.iframe);
			window.addEventListener("message", this._onWindowMessage.bind(this));
			const blob = new Blob([`<!DOCTYPE html><body><script>window.__WRAPPED_IFRAME_ID__=${JSON.stringify(this.id)};${frameSource}<\/script></body>`], { type: "text/html; charset=utf-8" });
			this.iframe.src = URL.createObjectURL(blob);
		}
		_onWindowMessage(e) {
			if (!e.data || e.data.vmIframeId !== this.id) return;
			if (e.data.ready) {
				this.ready = true;
				for (const { data, transfer } of this.queuedMessages) this.postMessage(data, transfer);
				this.queuedMessages.length = 0;
			}
			if (e.data.message) this.onmessage({ data: e.data.message });
		}
		onmessage() {}
		postMessage(data, transfer) {
			if (this.ready) {
				if (transfer) this.iframe.contentWindow.postMessage(data, "*", transfer);
				else this.iframe.contentWindow.postMessage(data, "*");
			} else this.queuedMessages.push({
				data,
				transfer
			});
		}
	};
	module.exports = IframeExtensionWorker;
}));
export default require_tw_iframe_extension_worker();
