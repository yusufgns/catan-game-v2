/// <reference types="vite/client" />

declare module '*.glsl' {
  const value: string;
  export default value;
}

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}
