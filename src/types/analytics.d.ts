declare global {
  interface Window {
    __analyticsConfig?: { gtmId: string }
    __analyticsLoaded?: boolean
  }
}

export {}
