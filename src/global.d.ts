export {}

declare global {
  interface Window {
    Module: any,
    FS: any,
    Buffer: any,
    exitGame: Function,
    message_queue: any[],
  }
} 

