import { ProxyUtils } from "./utils.js";

export class OfflineHandler {
  constructor(controller, store) {
    this.controller = controller;
    this.store = store;
    this.store.registerModule(this);
  }

  // This is the main entry point to this module, we trigger as soon
  // as the proxy is declared offline.
  async updateProxyState() {
    // Ensure the required props are set
    if (this.timerId) {
      // Clear the existing timeout
      clearTimeout(this.timerId);
    }
    this.timerId = 0;
    this.timeout = 1; // Seconds

    if ((await this.store.getProxyState()) === ProxyUtils.PROXY_STATE_OFFLINE) {
      this.attemptProxyReconnectionWithDelay();
    }
  }

  attemptProxyReconnectionWithDelay() {
    this.timerId = setTimeout(() => {
      this.attemptProxyReconnection();
    }, this.timeout * 1000); // to ms
  }

  async attemptProxyReconnection() {
    // Timeout has ended so reset the id
    this.timerId = 0;

    // Trigger a connection test
    let result = await this.controller.connection.test();

    if (result) {
      console.log("Proxy is back online.");
      return this.store.updateProxyState(ProxyUtils.PROXY_STATE_ONLINE);
    }

    // Increase the timeout for the next test
    this.timeout *= 2;

    console.log(
      "Proxy is still down. Testing connection after " +
        this.timeout +
        " seconds."
    );

    this.attemptProxyReconnectionWithDelay();
  }
}
