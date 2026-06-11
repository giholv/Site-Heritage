import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core'
import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';

class SDK {
  spec: Oas;
  core: APICore;

  constructor() {
    this.spec = Oas.init(definition);
    this.core = new APICore(this.spec, 'frenet/2.1 (api/6.1.3)');
  }

  /**
   * Optionally configure various options that the SDK allows.
   *
   * @param config Object of supported SDK options and toggles.
   * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
   * should be represented in milliseconds.
   */
  config(config: ConfigOptions) {
    this.core.setConfig(config);
  }

  /**
   * If the API you're using requires authentication you can supply the required credentials
   * through this method and the library will magically determine how they should be used
   * within your API request.
   *
   * With the exception of OpenID and MutualTLS, it supports all forms of authentication
   * supported by the OpenAPI specification.
   *
   * @example <caption>HTTP Basic auth</caption>
   * sdk.auth('username', 'password');
   *
   * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
   * sdk.auth('myBearerToken');
   *
   * @example <caption>API Keys</caption>
   * sdk.auth('myApiKey');
   *
   * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
   * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
   * @param values Your auth credentials for the API; can specify up to two strings or numbers.
   */
  auth(...values: string[] | number[]) {
    this.core.setAuth(...values);
    return this;
  }

  /**
   * If the API you're using offers alternate server URLs, and server variables, you can tell
   * the SDK which one to use with this method. To use it you can supply either one of the
   * server URLs that are contained within the OpenAPI definition (along with any server
   * variables), or you can pass it a fully qualified URL to use (that may or may not exist
   * within the OpenAPI definition).
   *
   * @example <caption>Server URL with server variables</caption>
   * sdk.server('https://{region}.api.example.com/{basePath}', {
   *   name: 'eu',
   *   basePath: 'v14',
   * });
   *
   * @example <caption>Fully qualified server URL</caption>
   * sdk.server('https://eu.api.example.com/v14');
   *
   * @param url Server URL
   * @param variables An object of variables to replace into the server URL.
   */
  server(url: string, variables = {}) {
    this.core.setServer(url, variables);
  }

  /**
   * Cotar o envio de objeto com as transportadoras parceiras, ativas na conta do cliente
   *
   * @summary Cotar envio
   * @throws FetchError<400, types.GetShipmentQuoteAsyncResponse400> business error
   * @throws FetchError<401, types.GetShipmentQuoteAsyncResponse401> unauthorized
   * @throws FetchError<500, types.GetShipmentQuoteAsyncResponse500> internal error
   */
  getShipmentQuoteAsync(body: types.GetShipmentQuoteAsyncBodyParam, metadata: types.GetShipmentQuoteAsyncMetadataParam): Promise<FetchResponse<200, types.GetShipmentQuoteAsyncResponse200>> {
    return this.core.fetch('/quotes', 'post', body, metadata);
  }

  /**
   * Inserir pedidos na Frenet
   *
   * @summary Inserir pedidos na Frenet
   * @throws FetchError<400, types.CreateOrderAsyncResponse400> business error
   * @throws FetchError<401, types.CreateOrderAsyncResponse401> unauthorized
   * @throws FetchError<500, types.CreateOrderAsyncResponse500> internal error
   */
  createOrderAsync(body: types.CreateOrderAsyncBodyParam, metadata: types.CreateOrderAsyncMetadataParam): Promise<FetchResponse<200, types.CreateOrderAsyncResponse200>> {
    return this.core.fetch('/orders', 'post', body, metadata);
  }

  /**
   * Serviço para obter dados de todos os pedidos
   *
   * @summary Obter todos os pedidos
   * @throws FetchError<400, types.GetOrdersAsyncResponse400> business error
   * @throws FetchError<401, types.GetOrdersAsyncResponse401> unauthorized
   * @throws FetchError<500, types.GetOrdersAsyncResponse500> internal error
   */
  getOrdersAsync(metadata: types.GetOrdersAsyncMetadataParam): Promise<FetchResponse<200, types.GetOrdersAsyncResponse200>> {
    return this.core.fetch('/orders', 'get', metadata);
  }

  /**
   * Serviço para obter dados do envio
   *
   * @summary Obter envio pelo Id
   * @throws FetchError<400, types.GetOrderAsyncResponse400> business error
   * @throws FetchError<401, types.GetOrderAsyncResponse401> unauthorized
   * @throws FetchError<500, types.GetOrderAsyncResponse500> internal error
   */
  getOrderAsync(metadata: types.GetOrderAsyncMetadataParam): Promise<FetchResponse<200, types.GetOrderAsyncResponse200>> {
    return this.core.fetch('/orders/{shipmentId}', 'get', metadata);
  }

  /**
   * Criar pedidos e Gerar Etiqueta quando houver saldo na conta
   *
   * @summary Criar pedidos e Gerar Etiqueta quando houver saldo na conta
   * @throws FetchError<400, types.CreateOrderOneClickAsyncResponse400> business error
   * @throws FetchError<401, types.CreateOrderOneClickAsyncResponse401> unauthorized
   * @throws FetchError<500, types.CreateOrderOneClickAsyncResponse500> internal error
   */
  createOrderOneClickAsync(body: types.CreateOrderOneClickAsyncBodyParam, metadata: types.CreateOrderOneClickAsyncMetadataParam): Promise<FetchResponse<200, types.CreateOrderOneClickAsyncResponse200>> {
    return this.core.fetch('/orders/oneclick', 'post', body, metadata);
  }
}

const createSDK = (() => { return new SDK(); })()
;

export default createSDK;

export type { CreateOrderAsyncBodyParam, CreateOrderAsyncMetadataParam, CreateOrderAsyncResponse200, CreateOrderAsyncResponse400, CreateOrderAsyncResponse401, CreateOrderAsyncResponse500, CreateOrderOneClickAsyncBodyParam, CreateOrderOneClickAsyncMetadataParam, CreateOrderOneClickAsyncResponse200, CreateOrderOneClickAsyncResponse400, CreateOrderOneClickAsyncResponse401, CreateOrderOneClickAsyncResponse500, GetOrderAsyncMetadataParam, GetOrderAsyncResponse200, GetOrderAsyncResponse400, GetOrderAsyncResponse401, GetOrderAsyncResponse500, GetOrdersAsyncMetadataParam, GetOrdersAsyncResponse200, GetOrdersAsyncResponse400, GetOrdersAsyncResponse401, GetOrdersAsyncResponse500, GetShipmentQuoteAsyncBodyParam, GetShipmentQuoteAsyncMetadataParam, GetShipmentQuoteAsyncResponse200, GetShipmentQuoteAsyncResponse400, GetShipmentQuoteAsyncResponse401, GetShipmentQuoteAsyncResponse500 } from './types';
