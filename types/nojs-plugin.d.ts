// ═══════════════════════════════════════════════════════════════════════
//  NoJS Plugin System — TypeScript Definitions
// ═══════════════════════════════════════════════════════════════════════

export type PluginCapability =
  | "directives"
  | "filters"
  | "validators"
  | "interceptors"
  | "globals"
  | "events"
  | "config"
  | "stores";

export interface NoJSPlugin {
  /** Unique, non-empty identifier for the plugin. */
  name: string;
  /** Optional version string for debugging. */
  version?: string;
  /** Optional list of capabilities the plugin intends to use. Advisory only. */
  capabilities?: PluginCapability[];
  /**
   * Called synchronously by NoJS.use().
   * Register directives, filters, validators, interceptors, globals, events, and config.
   */
  install(nojs: NoJSInstance, options?: Record<string, unknown>): void;
  /**
   * Called after NoJS.init() completes. DOM is available, router is initialized.
   * Optional.
   */
  init?(nojs: NoJSInstance): void | Promise<void>;
  /**
   * Called when the plugin is uninstalled or the app is torn down via NoJS.dispose().
   * Clean up intervals, listeners, connections. Optional.
   */
  dispose?(nojs: NoJSInstance): void | Promise<void>;
}

/**
 * A named function used as a shorthand for { name: fn.name, install: fn }.
 * Arrow functions and anonymous functions are rejected.
 */
export type NoJSInstallFn = ((nojs: NoJSInstance, options?: Record<string, unknown>) => void) & { name: string };

export interface DirectiveHandler {
  priority?: number;
  init(el: Element, attrName: string, value: string): void;
}

export interface RequestInterceptorResult {
  /** Cancel the request — throws AbortError. */
  [cancel: symbol]: true;
}

export interface RespondInterceptorResult<T = unknown> {
  /** Short-circuit the fetch and return this data directly. */
  [respond: symbol]: T;
}

export interface ReplaceInterceptorResult<T = unknown> {
  /** Replace the parsed response data. */
  [replace: symbol]: T;
}

export type RequestInterceptorFn = (
  url: string,
  opts: RequestInit & { headers: Record<string, string> },
) => void | RequestInit | RequestInterceptorResult | RespondInterceptorResult | Promise<void | RequestInit | RequestInterceptorResult | RespondInterceptorResult>;

export type ResponseInterceptorFn = (
  response: Response | Readonly<{ status: number; ok: boolean; statusText: string; headers: Headers; url: string }>,
  url: string,
) => void | Response | ReplaceInterceptorResult | Promise<void | Response | ReplaceInterceptorResult>;

export interface NoJSInstance {
  // ─── Plugin System ────────────────────────────────────────────────
  /**
   * Register a plugin. Plugins are installed synchronously via their install() method.
   * @param plugin - A plugin object or a named function.
   * @param options - Options passed to the plugin's install() method.
   */
  use(plugin: NoJSPlugin | NoJSInstallFn, options?: Record<string, unknown> & { trusted?: boolean }): void;

  /**
   * Inject a reactive global variable accessible as $name in any expression.
   * @param name - Global name (without $ prefix). Must not be reserved or forbidden.
   * @param value - The value to inject. Plain objects are wrapped in a reactive context.
   */
  global(name: string, value: unknown): void;

  /**
   * Tear down the app: dispose all plugins (reverse order), clear globals,
   * interceptors, and reset init state.
   */
  dispose(): Promise<void>;

  /** Symbol sentinel — return { [NoJS.CANCEL]: true } from a request interceptor to abort. */
  readonly CANCEL: symbol;
  /** Symbol sentinel — return { [NoJS.RESPOND]: data } from a request interceptor to skip fetch. */
  readonly RESPOND: symbol;
  /** Symbol sentinel — return { [NoJS.REPLACE]: data } from a response interceptor to replace data. */
  readonly REPLACE: symbol;

  // ─── Existing API ─────────────────────────────────────────────────
  baseApiUrl: string;
  locale: string;
  readonly version: string;

  config(opts?: Record<string, unknown>): void;
  init(root?: Element): Promise<void>;
  directive(name: string, handler: DirectiveHandler): void;
  filter(name: string, fn: (...args: unknown[]) => unknown): void;
  validator(name: string, fn: (...args: unknown[]) => boolean | string | Promise<boolean | string>): void;
  i18n(opts: Record<string, unknown>): void;
  on(event: string, fn: (data?: unknown) => void): () => void;
  interceptor(type: "request", fn: RequestInterceptorFn): void;
  interceptor(type: "response", fn: ResponseInterceptorFn): void;
  notify(): void;

  readonly store: Record<string, unknown>;
  readonly router: {
    push(path: string): Promise<void>;
    replace(path: string): Promise<void>;
    back(): Promise<void>;
    forward(): Promise<void>;
  } | null;

  createContext(data?: Record<string, unknown>, parent?: unknown): unknown;
  evaluate(expr: string, ctx: unknown): unknown;
  findContext(el: Element): unknown;
  processTree(root: Element): void;
  resolve(expr: string, ctx: unknown): unknown;
}

declare const NoJS: NoJSInstance;
export default NoJS;
