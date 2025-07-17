declare module '*.json' {
  const value: any;
  export default value;
}

declare global {
  interface Window {
    currentZoomScale?: number;
    simulation?: any;
  }
} 