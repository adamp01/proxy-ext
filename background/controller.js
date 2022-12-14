import { MessageManager } from "./messaging.js";
import { OfflineHandler } from "./offline.js";
import { ProxyHandler } from "./proxy.js";
import { ProxyStore } from "./store.js";
import { ProxyUtils } from "./utils.js";
import { TestConnection } from "./connTest.js";

export class ProxyController {
  constructor() {
    this.modules = new Set();
    this.store = new ProxyStore(this);
    this.connection = new TestConnection(this);
    this.proxy = new ProxyHandler(this, this.store);
    this.offline = new OfflineHandler(this, this.store);
    this.mm = new MessageManager(this);
  }

  async init() {
    // Test connection and ensure we are not disabled
    if (
      this.connection.test() &&
      !(this.store.getProxyState === ProxyUtils.PROXY_STATE_DISABLED)
    ) {
      this.store.updateProxyState(ProxyUtils.PROXY_STATE_ONLINE);
    }
    this.maybeEnableProxy();
  }

  async maybeEnableProxy() {
    // Enter conntest state that will bypass the proxy until we are
    // confirmed back online.
    this.store.updateProxyState(ProxyUtils.PROXY_STATE_CONNTEST);

    // Verify that the proxy is still live, or that the proxy is not the issue
    if (await this.connection.verify()) {
      return this.store.updateProxyState(ProxyUtils.PROXY_STATE_ONLINE);
    }

    // Otherwise, the proxy is offline
    this.store.updateProxyState(ProxyUtils.PROXY_STATE_OFFLINE);

    // TODO Notify the popup handler to inform the user
  }

  handleEvent(event) {
    switch (event) {
      case "testConnection":
        return this.connection.test();
      case "enableProxy":
      case "connectionRefused":
        return this.maybeEnableProxy();
      case "getRequestCallback":
        return this.proxy.onProxyRequest();
      case "disableProxy":
        return this.store.updateProxyState(ProxyUtils.PROXY_STATE_DISABLED);
    }
  }
}
