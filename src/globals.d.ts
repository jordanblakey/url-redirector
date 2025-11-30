declare global {
  var storage: typeof import('./storage').storage;
  var FORCE_LOCAL_STORAGE: boolean;
  var setForceLocalStorage: (value: boolean) => void;
}

export {};
