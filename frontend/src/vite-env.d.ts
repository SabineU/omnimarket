// frontend/src/vite-env.d.ts
/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.css' {
  const content: undefined;
  export default content;
}
