declare module '/color_journey.js' {
  /**
   * Represents the Emscripten module factory function.
   * When called, it initializes and returns a promise that resolves
   * to the compiled WebAssembly module instance.
   */
  const createModule: (options?: any) => Promise<any>;
  export default createModule;
}