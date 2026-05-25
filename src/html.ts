

export type HTMLContent = string | HTMLElement | Object;

export const html = (tag:string) => (...content: HTMLContent[]): HTMLElement => {
  const element = document.createElement(tag);
  content.forEach(item => {
    if (typeof item === 'string' || item instanceof HTMLElement) {
      element.append(item);
    }else{
      Object.assign(element, item);
    }
  });
  return element;
}

export const style = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>):HTMLElement => {
  Object.assign(el.style, styles);
  return el;
}

export const body = document.body;

document.head.append(
  html('style')(`
  body {
    font-family: monospace;
    // color: white;

    --color: #eee;
    --background: #111;

    color: var(--color);
    background: var(--background);
  }
  @media (prefers-color-scheme: light) {
    body {
      --color: #111;
      --background: #eee;
    }
  }
  textarea:focus {
    outline: none;
  }
`))


export const div = html('div');
export const h1 = html('h1');
export const h2 = html('h2');
export const h3 = html('h3');
export const p = html('p');
export const button = (onclick: ()=>void, ...content: HTMLContent[]) => html('button')(...content, {onclick});


