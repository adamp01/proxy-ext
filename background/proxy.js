import { ProxyUtils } from "./utils.js";

export class ProxyHandler {
  constructor(controller, store) {
    this.controller = controller;
    this.store = store;
    this.store.registerModule(this);

    this.passthroughs = new Set();
    this.proxyListener = null;
    this.proxyDetails = {
      type: "http",
      host: "0.0.0.0",
      port: 83,
    };

    this.getProxyPassthroughs();
    this.shouldRegisterProxyListener();

    // browser.webRequest.onBeforeSendHeaders.addListener(
    //   async request => {
    //     request.requestHeaders.push({ name: "Test-Header", value: "test" });
    //     return { requestHeaders: request.requestHeaders };
    //   },
    //   { urls: ["<all_urls>"] },
    //   ["blocking", "requestHeaders"]
    // );

    browser.webRequest.onErrorOccurred.addListener(
      async details => {
        // If we get an error with our test, ignore as it is
        // handled elsewhere.
        if (details.url === ProxyUtils.TEST_HTTP_REQUEST) {
          return;
        }

        if (details.error === ProxyUtils.CONNECTION_REFUSED) {
          return this.controller.handleEvent("connectionRefused");
        }
      },
      { urls: ["<all_urls>"] }
    );
  }

  async getProxyPassthroughs() {
    const proxySettings = await browser.proxy.settings.get({});

    this.passthroughs.clear();
    let uris = proxySettings.value.passthrough.split(",");
    for (let uri of uris) {
      this.passthroughs.add(uri.trim());
    }
  }

  async setProxyPassthroughs(passthrough) {
    const proxySettings = await browser.proxy.settings.get({});
    proxySettings.passthrough = passthrough;

    await browser.proxy.settings.set(proxySettings);
  }

  shouldRegisterProxyListener() {
    if (this.store.shouldProxy()) {
      this.registerProxyListener();
    } else {
      this.removeProxyListener();
    }
  }

  onProxyRequest() {
    return requestInfo => {
      // Have to wrap the function so that this registers properly
      return this.handleProxyRequest(requestInfo);
    };
  }

  registerProxyListener() {
    if (!this.proxyListener) {
      this.proxyListener = this.onProxyRequest();
      browser.proxy.onRequest.addListener(this.proxyListener, {
        urls: ["<all_urls>"],
      });
      console.log("Proxy request listener registered.");
    }
  }

  removeProxyListener() {
    if (this.proxyListener) {
      browser.proxy.onRequest.removeListener(this.proxyListener);
      this.proxyListener = null;
      console.log("Proxy request listener removed.");
    }
  }

  async handleProxyRequest(requestInfo) {
    if (this.shouldProxyRequest(requestInfo)) {
      console.log("Proxying: " + requestInfo.url);
      return this.proxyDetails;
    }
    return { type: "direct" };
  }

  shouldProxyRequest(requestInfo) {
    const url = new URL(requestInfo.url);
    function isProtocolAllowed(url) {
      return (
        url.protocol === "http:" ||
        url.protocol === "https:" ||
        url.protocol === "ftp:" ||
        url.protocol === "wss:" ||
        url.protocol === "ws:"
      );
    }
    function isLocal(url) {
      let hostname = url.hostname;
      return (
        /^(.+\.)?localhost[6]?$/.test(hostname) ||
        /^(.+\.)?localhost[6]?.localdomain[6]?$/.test(hostname) ||
        /\.[example|invalid|test]$/.test(hostname) ||
        /^(.+\.)?home\.arpa$/.test(hostname) ||
        /\.local$/.test(hostname) ||
        // Loopback
        /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        // Link Local
        /^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        // Private use
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        // Private use
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        // Private use
        /^172\.[1-3][6-9]\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        /\[[0:]+1\]/.test(hostname)
      );
    }

    // Proxy the test connection always
    if (requestInfo.url === ProxyUtils.TEST_HTTP_REQUEST) {
      return true;
    }

    // Mozilla DoH URL
    if (requestInfo.url === "https://mozilla.cloudflare-dns.com/dns-query") {
      return false;
    }

    // Don't proxy if protocol not allowed
    if (!isProtocolAllowed(url)) {
      return false;
    }

    // Don't proxy local connections
    if (isLocal(url)) {
      return false;
    }

    // If passthrough, passthrough
    if (this.passthroughs.has(url.host)) {
      return false;
    }

    // Ensure proxy state is still OK
    if (!this.store.shouldProxy()) {
      return false;
    }

    // Only allow requests from incognito tabs to be routed through proxy
    if (requestInfo.incognito) {
      return true;
    }

    return false;
  }

  updateProxyState() {
    this.shouldRegisterProxyListener();
  }
}
