import { isFunction } from '#/utils/type-guards.js';
import type { ComponentClass, FunctionComponent, VNode } from 'preact';
import { renderToString, renderToStringAsync } from 'preact-render-to-string';

export function renderJsx(template: FunctionComponent<void> | ComponentClass<void, void> | VNode): string;
export function renderJsx<Properties>(template: FunctionComponent<Properties> | ComponentClass<Properties, any>, properties: Properties): string;
export function renderJsx<Properties>(Template: FunctionComponent<any> | ComponentClass<any, any> | VNode, properties?: Properties): string { // eslint-disable-line @typescript-eslint/naming-convention
  if (isFunction(Template)) {
    return renderToString(<Template {...properties}></Template>);
  }

  return renderToString(Template);
}

export async function renderJsxAsync(template: FunctionComponent<void> | ComponentClass<void, void> | VNode): Promise<string>;
export async function renderJsxAsync<Properties>(template: FunctionComponent<Properties> | ComponentClass<Properties, any>, properties: Properties): Promise<string>;
export async function renderJsxAsync<Properties>(Template: FunctionComponent<any> | ComponentClass<any, any> | VNode, properties?: Properties): Promise<string> { // eslint-disable-line @typescript-eslint/naming-convention
  if (isFunction(Template)) {
    return renderToStringAsync(<Template {...properties}></Template>);
  }

  return renderToStringAsync(Template);
}
