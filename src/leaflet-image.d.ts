declare module 'leaflet-image' {
  function leafletImage(map: any, callback: (err: any, canvas: HTMLCanvasElement) => void): void
  export = leafletImage
}
