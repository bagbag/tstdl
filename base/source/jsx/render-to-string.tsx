import { isFunction } from '#/utils/type-guards.js';
import type { ComponentClass, FunctionComponent, VNode } from 'preact';
import { render } from 'preact-render-to-string';

export function renderJsx(template: FunctionComponent<void> | ComponentClass<void, void> | VNode): string;
export function renderJsx<Properties>(template: FunctionComponent<Properties> | ComponentClass<Properties, any>, properties: Properties): string;
export function renderJsx<Properties>(Template: FunctionComponent<any> | ComponentClass<any, any> | VNode, properties?: Properties): string { // eslint-disable-line @typescript-eslint/naming-convention
  if (isFunction(Template)) {
    return render(<Template {...properties}></Template>);
  }

  return render(Template);
}
