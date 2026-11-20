// Compiles a dart2wasm-generated main module from `source` which can then
// be instantiated via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string'], importedStringConstants: ''};
  return new CompiledApp(
      await _compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm module from `bytes` which is then
// instantiable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string'], importedStringConstants: ''};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

let _isCompileStreamingSupported;
async function _compileStreaming(source, builtins) {
  _isCompileStreamingSupported ??= WebAssembly.compileStreaming(
    new Response(
      new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,2,23,1,14,119,97,115,109,58,106,115,45,115,116,114,105,110,103,4,99,97,115,116,0,0]),
      {headers: {'Content-Type': 'application/wasm'}},
    ),
    builtins,
  ).then(() => false, (e) => e instanceof WebAssembly.CompileError);
  if (await _isCompileStreamingSupported) {
    return WebAssembly.compileStreaming(source, builtins);
  }
  return WebAssembly.compile(await (await source).arrayBuffer(), builtins);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arguments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `use-load-ids` option is passed. Each load ID maps to
  //   one or more wasm files as specified in the emitted JSON file. It also
  //   takes a callback that should be invoked for each loaded module with 2
  //   arguments: (1) the module name, (2) the loaded module in a format
  //   supported by `WebAssembly.compile` or `WebAssembly.compileStreaming`.
  //   The callback returns a Promise that resolves when the module is
  //   instantiated.
  //   loadDeferredId should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports, {loadDeferredModules, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            AB: x0 => new Int16Array(x0),
      AC: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      AD: x0 => x0.clientX,
      AE: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      AF: x0 => x0.touches,
      AG: (x0,x1) => x0.go(x1),
      AH: x0 => x0.clipboard,
      AI: x0 => new WeakRef(x0),
      AJ: () => globalThis.window.ImageDecoder,
      AK: x0 => x0.altKey,
      AL: x0 => x0.profile,
      AM: (x0,x1,x2) => new firebase_firestore.FieldPath(x0,x1,x2),
      AN: x0 => globalThis.firebase_firestore.deleteDoc(x0),
      AO: () => globalThis.firebase_core.SDK_VERSION,
      AP: x0 => x0.buildConfig,
      B: s => printToConsole(s),
      BB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      BC: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      BD: (x0,x1,x2) => x0.addEventListener(x1,x2),
      BE: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      BF: x0 => x0.pressure,
      BG: (x0,x1) => x0.querySelectorAll(x1),
      BH: (x0,x1) => x0.writeText(x1),
      BI: x0 => x0.deref(),
      BJ: x0 => x0.abort(),
      BK: x0 => x0.ctrlKey,
      BL: x0 => x0.isNewUser,
      BM: (x0,x1,x2,x3) => new firebase_firestore.FieldPath(x0,x1,x2,x3),
      BN: x0 => globalThis.firebase_firestore.getDoc(x0),
      BO: (x0,x1) => x0.debug(x1),
      BP: x0 => x0.length,
      C: Function.prototype.call.bind(Number.prototype.toString),
      CB: x0 => new Uint16Array(x0),
      CC: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      CD: (x0,x1,x2) => x0.setAttribute(x1,x2),
      CE: (o, i) => o[i],
      CF: x0 => x0.tiltY,
      CG: (x0,x1) => x0.requestAnimationFrame(x1),
      CH: x0 => x0.unlock(),
      CI: () => globalThis.WeakRef,
      CJ: () => new AbortController(),
      CK: x0 => x0.isComposing,
      CL: x0 => globalThis.firebase_auth.getAdditionalUserInfo(x0),
      CM: (x0,x1,x2,x3,x4) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4),
      CN: x0 => globalThis.firebase_firestore.getDocFromServer(x0),
      CO: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      CP: x0 => x0.getReader(),
      D: Function.prototype.call.bind(BigInt.prototype.toString),
      DB: x0 => new Int32Array(x0),
      DC: (x0,x1) => x0.querySelector(x1),
      DD: (x0,x1) => x0.closest(x1),
      DE: o => o.length,
      DF: x0 => x0.tiltX,
      DG: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      DH: (x0,x1) => x0.lock(x1),
      DI: x0 => x0.message,
      DJ: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      DK: x0 => x0.code,
      DL: x0 => globalThis.firebase_auth.OAuthProvider.credentialFromError(x0),
      DM: (x0,x1,x2,x3,x4,x5) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5),
      DN: x0 => globalThis.firebase_firestore.getDocFromCache(x0),
      DO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      DP: x0 => x0.value,
      E: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      EB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      EC: (x0,x1) => x0.item(x1),
      ED: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      EE: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      EF: x0 => x0.pointerType,
      EG: x0 => x0.now(),
      EH: x0 => x0.orientation,
      EI: (x0,x1) => x0.getRandomValues(x1),
      EJ: (x0,x1) => globalThis.fetch(x0,x1),
      EK: x0 => x0.repeat,
      EL: x0 => x0.session,
      EM: (x0,x1,x2,x3,x4,x5,x6) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6),
      EN: x0 => x0.source,
      EO: (x0,x1) => ({createScript: x0,createScriptURL: x1}),
      EP: x0 => x0.done,
      F: () => new Error().stack,
      FB: x0 => new Uint32Array(x0),
      FC: x0 => x0.length,
      FD: (handle) => clearTimeout(handle),
      FE: x0 => x0.language,
      FF: x0 => x0.pointerId,
      FG: x0 => x0.performance,
      FH: (x0,x1) => x0.querySelector(x1),
      FI: () => globalThis.crypto,
      FJ: (x0,x1) => x0.get(x1),
      FK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      FL: x0 => x0.phoneNumber,
      FM: (x0,x1,x2,x3,x4,x5,x6,x7) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6,x7),
      FN: x0 => ({source: x0}),
      FO: (x0,x1,x2) => x0.createPolicy(x1,x2),
      FP: x0 => x0.read(),
      G: s => JSON.stringify(s),
      GB: x0 => new Float32Array(x0),
      GC: (x0,x1) => x0.querySelectorAll(x1),
      GD: x0 => x0.maxTouchPoints,
      GE: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      GF: x0 => x0.getCoalescedEvents(),
      GG: (d, digits) => d.toFixed(digits),
      GH: (x0,x1) => { x0.title = x1 },
      GI: l => new DataView(new ArrayBuffer(l)),
      GJ: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      GK: (x0,x1) => x0.canShare(x1),
      GL: x0 => x0.uid,
      GM: (x0,x1,x2,x3,x4,x5,x6,x7,x8) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6,x7,x8),
      GN: (x0,x1,x2) => globalThis.firebase_firestore.setDoc(x0,x1,x2),
      GO: (x0,x1) => x0.createScriptURL(x1),
      GP: x0 => x0.body,
      H: Function.prototype.call.bind(Number.prototype.toString),
      HB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      HC: (x0,x1) => x0.getAttribute(x1),
      HD: x0 => x0.platform,
      HE: () => globalThis.window.FinalizationRegistry,
      HF: s => s.trimLeft(),
      HG: x0 => x0.maxHeight,
      HH: (x0,x1) => x0.vibrate(x1),
      HI: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      HJ: (x0,x1) => x0.forEach(x1),
      HK: (x0,x1) => x0.share(x1),
      HL: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      HM: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6,x7,x8,x9),
      HN: (x0,x1) => globalThis.firebase_firestore.setDoc(x0,x1),
      HO: (x0,x1,x2) => x0.createScript(x1,x2),
      HP: (x0,x1) => new OffscreenCanvas(x0,x1),
      I: Function.prototype.call.bind(String.prototype.indexOf),
      IB: x0 => new Float64Array(x0),
      IC: x0 => x0.remove(),
      ID: s => new Date(s * 1000).getTimezoneOffset() * 60,
      IE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      IF: s => s.toUpperCase(),
      IG: x0 => x0.maxWidth,
      IH: x0 => x0.arrayBuffer(),
      II: (a, s, e) => a.slice(s, e),
      IJ: x0 => x0.name,
      IK: x0 => x0.message,
      IL: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      IM: () => globalThis.firebase_firestore.documentId(),
      IN: (x0,x1) => ({includeMetadataChanges: x0,source: x1}),
      IO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      IP: x0 => x0.assetBase,
      J: (s, p, i) => s.lastIndexOf(p, i),
      JB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      JC: (x0,x1) => x0.appendChild(x1),
      JD: Date.now,
      JE: x0 => new window.FinalizationRegistry(x0),
      JF: (x0,x1) => x0[x1],
      JG: x0 => x0.minHeight,
      JH: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      JI: x0 => x0.userAgent,
      JJ: x0 => x0.statusText,
      JK: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      JL: x0 => x0.enrollmentTime,
      JM: (x0,x1) => new firebase_firestore.Timestamp(x0,x1),
      JN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      JO: (o, p) => delete o[p],
      JP: x0 => x0.loader,
      K: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      KB: x0 => new ArrayBuffer(x0),
      KC: (x0,x1) => x0.append(x1),
      KD: (x0,x1) => x0.contains(x1),
      KE: (x0,x1) => x0.unregister(x1),
      KF: x0 => x0.length,
      KG: x0 => x0.minWidth,
      KH: x0 => x0.status,
      KI: x0 => x0.navigator,
      KJ: x0 => x0.url,
      KK: (x0,x1) => ({files: x0,text: x1}),
      KL: x0 => x0.factorId,
      KM: (x0,x1) => new firebase_firestore.GeoPoint(x0,x1),
      KN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      KO: (x0,x1) => { x0.text = x1 },
      KP: () => globalThis._flutter,
      L: o => o === undefined,
      LB: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      LC: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      LD: (decoder, codeUnits) => decoder.decode(codeUnits),
      LE: x0 => x0.preventDefault(),
      LF: (x0,x1) => x0.exec(x1),
      LG: (x0,x1) => x0.removeProperty(x1),
      LH: (x0,x1) => x0.fetch(x1),
      LI: () => globalThis.window,
      LJ: x0 => x0.status,
      LK: x0 => ({files: x0}),
      LL: x0 => x0.displayName,
      LM: x0 => globalThis.firebase_firestore.vector(x0),
      LN: (x0,x1,x2,x3) => globalThis.firebase_firestore.onSnapshot(x0,x1,x2,x3),
      LO: x0 => x0.head,
      M: o => String(o),
      MB: (x0,x1,x2) => new DataView(x0,x1,x2),
      MC: x0 => x0.style,
      MD: () => new TextDecoder("utf-8", {fatal: true}),
      ME: x0 => x0.parent,
      MF: x0 => x0.index,
      MG: (x0,x1) => x0.add(x1),
      MH: x0 => x0.content,
      MI: (x0,x1) => x0.matchMedia(x1),
      MJ: x0 => x0.getReader(),
      MK: x0 => ({text: x0}),
      ML: x0 => x0.hints,
      MM: x0 => globalThis.firebase_firestore.Bytes.fromUint8Array(x0),
      MN: (x0,x1,x2) => globalThis.firebase_firestore.onSnapshot(x0,x1,x2),
      MO: (x0,x1) => { x0.text = x1 },
      N: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      NB: (o, p) => o[p],
      NC: x0 => x0.debugShowSemanticsNodes,
      ND: () => new TextDecoder("utf-8", {fatal: false}),
      NE: x0 => x0.timeStamp,
      NF: x0 => x0.flags,
      NG: x0 => x0.data,
      NH: x0 => x0.document,
      NI: x0 => x0.matches,
      NJ: x0 => x0.read(),
      NK: (x0,x1) => x0.getItem(x1),
      NL: x0 => x0.tenantId,
      NM: (x0,x1) => globalThis.firebase_firestore.doc(x0,x1),
      NN: () => globalThis.firebase_firestore.updateDoc,
      NO: x0 => x0.trustedTypes,
      O: (x0,x1) => x0.didCreateEngineInitializer(x1),
      OB: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      OC: o => o,
      OD: (a, i, v) => a[i] = v,
      OE: (x0,x1) => x0.hasAttribute(x1),
      OF: (a, s) => a.join(s),
      OG: (x0,x1) => x0.removeAttribute(x1),
      OH: () => typeof dartUseDateNowForTicks !== "undefined",
      OI: x0 => ({type: x0}),
      OJ: x0 => x0.value,
      OK: x0 => x0.localStorage,
      OL: x0 => x0.phoneNumber,
      OM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      ON: x0 => x0.metadata,
      OO: () => globalThis.console,
      P: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      PB: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      PC: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      PD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      PE: x0 => x0.type,
      PF: (x0,x1) => x0.error(x1),
      PG: (x0,x1) => { x0.value = x1 },
      PH: () => Date.now(),
      PI: (x0,x1) => new Blob(x0,x1),
      PJ: x0 => x0.done,
      PK: (x0,x1) => x0.key(x1),
      PL: x0 => x0.email,
      PM: x0 => ({maxAttempts: x0}),
      PN: x0 => x0.doc,
      PO: x0 => x0.trustedTypes,
      Q: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      QB: o => o.byteOffset,
      QC: (x0,x1) => x0.warn(x1),
      QD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      QE: (x0,x1) => x0.getModifierState(x1),
      QF: () => globalThis.console,
      QG: (x0,x1) => { x0.value = x1 },
      QH: () => 1000 * performance.now(),
      QI: x0 => globalThis.URL.createObjectURL(x0),
      QJ: x0 => x0.cancel(),
      QK: x0 => x0.length,
      QL: (x0,x1) => globalThis.firebase_auth.getMultiFactorResolver(x0,x1),
      QM: (x0,x1,x2) => globalThis.firebase_firestore.runTransaction(x0,x1,x2),
      QN: x0 => x0.newIndex,
      QO: (x0,x1) => { x0.crossOrigin = x1 },
      R: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      RB: o => o.buffer,
      RC: x0 => x0.console,
      RD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      RE: x0 => x0.buttons,
      RF: s => s.trimRight(),
      RG: x0 => x0.value,
      RH: x0 => new Uint8Array(x0),
      RI: (x0,x1) => x0.appendChild(x1),
      RJ: x0 => x0.body,
      RK: (x0,x1) => x0.removeItem(x1),
      RL: x0 => x0.customData,
      RM: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      RN: x0 => x0.oldIndex,
      RO: (x0,x1) => { x0.type = x1 },
      S: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      SB: Function.prototype.call.bind(DataView.prototype.getUint8),
      SC: () => globalThis.window,
      SD: (s) => +s,
      SE: x0 => x0.ctrlKey,
      SF: x0 => x0.blur(),
      SG: x0 => x0.selectionDirection,
      SH: (x0,x1,x2) => x0.slice(x1,x2),
      SI: x0 => x0.click(),
      SJ: x0 => x0.headers,
      SK: (x0,x1,x2) => x0.setItem(x1,x2),
      SL: x0 => x0.message,
      SM: (o, p, v) => o[p] = v,
      SN: x0 => x0.type,
      SO: (o, t) => typeof o === t,
      T: x0 => new Promise(x0),
      TB: (b, o) => new DataView(b, o),
      TC: (o, c) => o instanceof c,
      TD: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      TE: x0 => x0.getBoundingClientRect(),
      TF: x0 => x0.button,
      TG: x0 => x0.selectionStart,
      TH: (x0,x1) => x0.decode(x1),
      TI: x0 => x0.remove(),
      TJ: x0 => x0.signal,
      TK: (x0,x1,x2) => globalThis.firebase_core.registerVersion(x0,x1,x2),
      TL: x0 => x0.code,
      TM: (o,s,v) => o[s] = v,
      TN: x0 => x0.docChanges(),
      TO: (o) => Array.isArray(o) || o instanceof Array,
      U: (x0,x1,x2) => x0.call(x1,x2),
      UB: (b, o, l) => new DataView(b, o, l),
      UC: (string, token) => string.split(token),
      UD: s => s.trim(),
      UE: x0 => x0.y,
      UF: (x0,x1) => x0.prepend(x1),
      UG: x0 => x0.selectionEnd,
      UH: (x0,x1) => x0.adoptText(x1),
      UI: x0 => globalThis.URL.revokeObjectURL(x0),
      UJ: x0 => x0.pop(),
      UK: x0 => x0.sessionStorage,
      UL: x0 => x0.code,
      UM: () => Symbol("jsBoxedDartObjectProperty"),
      UN: x0 => x0.docs,
      UO: x0 => x0.close(),
      V: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      VB: Function.prototype.call.bind(DataView.prototype.getFloat64),
      VC: o => o instanceof Array,
      VD: x0 => x0.classList,
      VE: x0 => x0.x,
      VF: x0 => x0.parentElement,
      VG: x0 => x0.value,
      VH: x0 => x0.first(),
      VI: x0 => x0.body,
      VJ: (x0,x1,x2) => x0.setProperty(x1,x2),
      VK: (x0,x1) => globalThis.firebase_auth.linkWithCredential(x0,x1),
      VL: x0 => x0.name,
      VM: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      VN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      VO: x0 => x0.disconnect(),
      W: x0 => new Array(x0),
      WB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      WC: (a, i) => a[i],
      WD: x0 => x0.relatedTarget,
      WE: x0 => x0.top,
      WF: x0 => x0.innerHeight,
      WG: x0 => x0.selectionDirection,
      WH: x0 => x0.next(),
      WI: () => globalThis.document,
      WJ: (x0,x1,x2) => x0.setAttribute(x1,x2),
      WK: (x0,x1) => globalThis.firebase_auth.EmailAuthProvider.credential(x0,x1),
      WL: (x0,x1) => globalThis.firebase_auth.signInWithCredential(x0,x1),
      WM: x0 => globalThis.firebase_firestore.increment(x0),
      WN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      WO: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      X: o => [o],
      XB: Function.prototype.call.bind(DataView.prototype.setFloat64),
      XC: a => a.length,
      XD: x0 => x0.hasFocus(),
      XE: x0 => x0.left,
      XF: x0 => x0.innerWidth,
      XG: x0 => x0.selectionStart,
      XH: x0 => x0.current(),
      XI: (x0,x1) => { x0.download = x1 },
      XJ: (x0,x1) => { x0.textContent = x1 },
      XK: x0 => x0.reload(),
      XL: (x0,x1,x2) => ({errorMap: x0,persistence: x1,popupRedirectResolver: x2}),
      XM: () => globalThis.firebase_firestore.arrayUnion,
      XN: (x0,x1,x2) => globalThis.firebase_firestore.where(x0,x1,x2),
      XO: (x0,x1) => { x0.src = x1 },
      Y: (o0, o1) => [o0, o1],
      YB: (t, s) => t.set(s),
      YC: (x0,x1) => x0.test(x1),
      YD: x0 => x0.shiftKey,
      YE: x0 => x0.scrollTop,
      YF: x0 => x0.height,
      YG: x0 => x0.selectionEnd,
      YH: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      YI: (x0,x1) => { x0.href = x1 },
      YJ: x0 => x0.style,
      YK: (x0,x1) => globalThis.firebase_auth.updatePassword(x0,x1),
      YL: (x0,x1) => globalThis.firebase_auth.initializeAuth(x0,x1),
      YM: () => globalThis.firebase_firestore.serverTimestamp(),
      YN: (x0,x1) => globalThis.firebase_firestore.query(x0,x1),
      YO: x0 => x0.pause(),
      Z: (o0, o1, o2) => [o0, o1, o2],
      ZB: Function.prototype.call.bind(DataView.prototype.setFloat32),
      ZC: x0 => x0.userAgent,
      ZD: x0 => x0.body,
      ZE: x0 => x0.offsetTop,
      ZF: x0 => x0.width,
      ZG: (x0,x1) => { x0.name = x1 },
      ZH: x0 => x0.v8BreakIterator,
      ZI: (x0,x1) => x0.createElement(x1),
      ZJ: (x0,x1,x2) => x0.insertBefore(x1,x2),
      ZK: x0 => x0.delete(),
      ZL: () => globalThis.firebase_auth.browserPopupRedirectResolver,
      ZM: (x0,x1) => x0.delete(x1),
      ZN: () => globalThis.firebase_firestore.and,
      ZO: x0 => x0.currentTime,
      a: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      aB: Function.prototype.call.bind(DataView.prototype.getFloat32),
      aC: x0 => x0.navigator,
      aD: x0 => x0.visibilityState,
      aE: x0 => x0.scrollLeft,
      aF: x0 => x0.clientHeight,
      aG: (x0,x1) => { x0.placeholder = x1 },
      aH: () => globalThis.Intl,
      aI: x0 => x0.close(),
      aJ: x0 => x0.id,
      aK: (x0,x1) => globalThis.firebase_auth.reauthenticateWithCredential(x0,x1),
      aL: () => globalThis.firebase_auth.debugErrorMap,
      aM: (x0,x1,x2,x3) => x0.set(x1,x2,x3),
      aN: () => globalThis.firebase_firestore.or,
      aO: x0 => x0.resume(),
      b: (x0,x1,x2) => { x0[x1] = x2 },
      bB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      bC: Function.prototype.call.bind(String.prototype.toLowerCase),
      bD: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      bE: x0 => x0.offsetLeft,
      bF: x0 => x0.clientWidth,
      bG: (x0,x1) => { x0.autocomplete = x1 },
      bH: (x0,x1) => x0.segment(x1),
      bI: x0 => x0.height,
      bJ: x0 => x0.offsetHeight,
      bK: x0 => x0.providerId,
      bL: () => globalThis.firebase_auth.browserSessionPersistence,
      bM: (x0,x1,x2) => x0.set(x1,x2),
      bN: x0 => globalThis.firebase_firestore.limitToLast(x0),
      bO: x0 => x0.play(),
      c: o => o,
      cB: Function.prototype.call.bind(DataView.prototype.getUint32),
      cC: Object.is,
      cD: x0 => x0.disconnect(),
      cE: x0 => x0.offsetParent,
      cF: x0 => x0.isConnected,
      cG: (x0,x1) => { x0.type = x1 },
      cH: x0 => x0.index,
      cI: x0 => x0.width,
      cJ: x0 => x0.offsetWidth,
      cK: x0 => x0.uid,
      cL: () => globalThis.firebase_auth.browserLocalPersistence,
      cM: x0 => ({merge: x0}),
      cN: x0 => globalThis.firebase_firestore.limit(x0),
      cO: (x0,x1) => { x0.currentTime = x1 },
      d: (o, p) => o[p],
      dB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      dC: x0 => x0.vendor,
      dD: x0 => new Intl.Locale(x0),
      dE: x0 => x0.offsetY,
      dF: x0 => x0.head,
      dG: (x0,x1) => { x0.name = x1 },
      dH: x0 => x0.next(),
      dI: (x0,x1,x2,x3,x4,x5) => x0.createImageBitmap(x1,x2,x3,x4,x5),
      dJ: x0 => x0.stopPropagation(),
      dK: x0 => x0.providerData,
      dL: () => globalThis.firebase_auth.indexedDBLocalPersistence,
      dM: x0 => ({serverTimestamps: x0}),
      dN: () => globalThis.firebase_firestore.endBefore,
      dO: x0 => x0.state,
      e: () => globalThis,
      eB: Function.prototype.call.bind(DataView.prototype.getInt32),
      eC: (x0,x1) => x0.createTextNode(x1),
      eD: x0 => x0.region,
      eE: x0 => x0.offsetX,
      eF: (x0,x1) => { x0.content = x1 },
      eG: (x0,x1) => { x0.placeholder = x1 },
      eH: x0 => x0.value,
      eI: (x0,x1) => x0.createImageBitmap(x1),
      eJ: x0 => x0.disabled,
      eK: x0 => x0.tenantId,
      eL: x0 => globalThis.firebase_core.getApp(x0),
      eM: x0 => x0.fromCache,
      eN: () => globalThis.firebase_firestore.endAt,
      eO: () => new AudioContext(),
      f: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      fB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      fC: (x0,x1) => { x0.id = x1 },
      fD: x0 => x0.script,
      fE: (o, p, r) => o.replace(p, () => r),
      fF: (x0,x1) => { x0.name = x1 },
      fG: (x0,x1) => { x0.scrollTop = x1 },
      fH: x0 => x0.done,
      fI: x0 => new Blob(x0),
      fJ: (x0,x1) => { x0.min = x1 },
      fK: x0 => x0.refreshToken,
      fL: () => globalThis.firebase_core.getApp(),
      fM: x0 => x0.hasPendingWrites,
      fN: () => globalThis.firebase_firestore.startAfter,
      fO: (x0,x1) => x0.createMediaElementSource(x1),
      g: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      gB: o => o instanceof Uint16Array,
      gC: (x0,x1) => { x0.nonce = x1 },
      gD: x0 => x0.language,
      gE: (x0,x1) => { x0.lastIndex = x1 },
      gF: (x0,x1) => x0.removeChild(x1),
      gG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      gH: (o, m, a) => o[m].apply(o, a),
      gI: x0 => x0.close(),
      gJ: (x0,x1) => { x0.max = x1 },
      gK: x0 => x0.photoURL,
      gL: (x0,x1,x2) => globalThis.firebase_auth.signInWithEmailAndPassword(x0,x1,x2),
      gM: x0 => x0.metadata,
      gN: () => globalThis.firebase_firestore.startAt,
      gO: x0 => x0.createGain(),
      h: (x0,x1) => ({addView: x0,removeView: x1}),
      hB: Function.prototype.call.bind(DataView.prototype.getUint16),
      hC: x0 => x0.nonce,
      hD: x0 => x0.languages,
      hE: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      hF: x0 => x0.firstChild,
      hG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      hH: x0 => x0.iterator,
      hI: x0 => x0.naturalHeight,
      hJ: (x0,x1) => { x0.disabled = x1 },
      hK: x0 => x0.phoneNumber,
      hL: (x0,x1,x2) => globalThis.firebase_auth.sendPasswordResetEmail(x0,x1,x2),
      hM: x0 => x0.toArray(),
      hN: (x0,x1) => globalThis.firebase_firestore.orderBy(x0,x1),
      hO: x0 => x0.createStereoPanner(),
      i: (l, r) => l === r,
      iB: o => o instanceof Int16Array,
      iC: () => globalThis.window.flutterConfiguration,
      iD: (x0,x1) => x0.observe(x1),
      iE: o => o instanceof RegExp,
      iF: x0 => x0.viewConstraints,
      iG: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      iH: () => globalThis.Symbol,
      iI: x0 => x0.naturalWidth,
      iJ: (x0,x1) => { x0.scrollLeft = x1 },
      iK: x0 => x0.lastSignInTime,
      iL: x0 => x0.signOut(),
      iM: x0 => x0.toUint8Array(),
      iN: x0 => globalThis.firebase_firestore.getDocs(x0),
      iO: (x0,x1) => x0.connect(x1),
      j: x0 => x0.random(),
      jB: Function.prototype.call.bind(DataView.prototype.getInt16),
      jC: (x0,x1) => x0.attachShadow(x1),
      jD: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      jE: x0 => x0.dotAll,
      jF: x0 => x0.hostElement,
      jG: x0 => x0.keyCode,
      jH: (x0,x1) => new Intl.Segmenter(x0,x1),
      jI: (x0,x1) => { x0.src = x1 },
      jJ: (x0,x1) => { x0.spellcheck = x1 },
      jK: x0 => x0.creationTime,
      jL: x0 => x0.tenantId,
      jM: () => globalThis.firebase_firestore.Bytes,
      jN: x0 => globalThis.firebase_firestore.getDocsFromServer(x0),
      jO: x0 => x0.load(),
      k: o => o,
      kB: o => o instanceof Uint8ClampedArray,
      kC: (x0,x1) => x0.createElement(x1),
      kD: x0 => new ResizeObserver(x0),
      kE: x0 => x0.unicode,
      kF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      kG: (x0,x1) => x0.scrollIntoView(x1),
      kH: x0 => x0.Segmenter,
      kI: x0 => x0.displayHeight,
      kJ: (x0,x1) => { x0.disabled = x1 },
      kK: x0 => x0.metadata,
      kL: x0 => x0.call(),
      kM: () => globalThis.firebase_firestore.VectorValue,
      kN: x0 => globalThis.firebase_firestore.getDocsFromCache(x0),
      kO: x0 => x0.destination,
      l: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      lB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      lC: x0 => x0.scale,
      lD: (x0,x1) => x0.getPropertyValue(x1),
      lE: x0 => x0.ignoreCase,
      lF: x0 => ({runApp: x0}),
      lG: x0 => x0.multiViewEnabled,
      lH: x0 => x0.buffer,
      lI: x0 => x0.displayWidth,
      lJ: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9) => x0.drawImage(x1,x2,x3,x4,x5,x6,x7,x8,x9),
      lK: x0 => x0.isAnonymous,
      lL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      lM: x0 => x0.longitude,
      lN: x0 => x0.path,
      lO: (x0,x1) => { x0.value = x1 },
      m: () => globalThis.Math,
      mB: Function.prototype.call.bind(DataView.prototype.setInt32),
      mC: x0 => x0.visualViewport,
      mD: x0 => globalThis.parseFloat(x0),
      mE: x0 => x0.multiline,
      mF: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      mG: (x0,x1) => x0.replaceWith(x1),
      mH: x0 => x0.wasmMemory,
      mI: x0 => x0.duration,
      mJ: (x0,x1) => x0.getContext(x1),
      mK: x0 => x0.emailVerified,
      mL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      mM: x0 => x0.latitude,
      mN: x0 => globalThis.firebase_firestore.doc(x0),
      mO: x0 => x0.gain,
      n: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      nB: Function.prototype.call.bind(DataView.prototype.setUint32),
      nC: x0 => x0.devicePixelRatio,
      nD: (x0,x1) => x0.getComputedStyle(x1),
      nE: (o, p, r) => o.replaceAll(p, () => r),
      nF: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      nG: (x0,x1) => { x0.className = x1 },
      nH: () => globalThis.window._flutter_skwasmInstance,
      nI: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      nJ: (x0,x1) => { x0.height = x1 },
      nK: x0 => x0.email,
      nL: (x0,x1,x2) => x0.onIdTokenChanged(x1,x2),
      nM: () => globalThis.firebase_firestore.GeoPoint,
      nN: (x0,x1) => globalThis.firebase_firestore.collection(x0,x1),
      nO: x0 => x0.code,
      o: b => !!b,
      oB: Function.prototype.call.bind(DataView.prototype.setInt16),
      oC: x0 => x0.height,
      oD: x0 => x0.documentElement,
      oE: x0 => x0.deltaMode,
      oF: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      oG: (x0,x1) => { x0.tabIndex = x1 },
      oH: () => new TextDecoder(),
      oI: (x0,x1) => x0.decode(x1),
      oJ: (x0,x1) => { x0.width = x1 },
      oK: x0 => x0.displayName,
      oL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      oM: (x0,x1) => x0.data(x1),
      oN: x0 => x0.measurementId,
      oO: x0 => x0.message,
      p: () => globalThis.document,
      pB: Function.prototype.call.bind(DataView.prototype.setUint16),
      pC: x0 => x0.width,
      pD: x0 => x0.computedStyleMap(),
      pE: x0 => x0.deltaY,
      pF: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      pG: (x0,x1) => { x0.action = x1 },
      pH: (map, o, v) => map.set(o, v),
      pI: x0 => x0.image,
      pJ: (x0,x1) => x0.transferFromImageBitmap(x1),
      pK: x0 => globalThis.firebase_auth.multiFactor(x0),
      pL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      pM: x0 => x0.nanoseconds,
      pN: x0 => x0.appId,
      pO: x0 => x0.error,
      q: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      qB: Function.prototype.call.bind(DataView.prototype.setUint8),
      qC: x0 => x0.screen,
      qD: (x0,x1) => x0.get(x1),
      qE: x0 => x0.deltaX,
      qF: x0 => x0.history,
      qG: (x0,x1) => { x0.method = x1 },
      qH: (map, o) => map.get(o),
      qI: x0 => x0.close(),
      qJ: x0 => x0.rasterEndMilliseconds,
      qK: x0 => x0.toJSON(),
      qL: (x0,x1,x2) => x0.onAuthStateChanged(x1,x2),
      qM: x0 => x0.seconds,
      qN: x0 => x0.messagingSenderId,
      qO: x0 => x0.duration,
      r: (x0,x1) => x0.focus(x1),
      rB: Function.prototype.call.bind(DataView.prototype.setInt8),
      rC: (string, times) => string.repeat(times),
      rD: (o, p) => p in o,
      rE: x0 => x0.wheelDeltaY,
      rF: x0 => x0.search,
      rG: (x0,x1) => { x0.noValidate = x1 },
      rH: () => new WeakMap(),
      rI: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      rJ: x0 => x0.rasterStartMilliseconds,
      rK: x0 => x0.user,
      rL: x0 => x0.currentUser,
      rM: () => globalThis.firebase_firestore.Timestamp,
      rN: x0 => x0.authDomain,
      rO: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      s: () => ({}),
      sB: Function.prototype.call.bind(DataView.prototype.getInt8),
      sC: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      sD: (x0,x1) => { x0.textContent = x1 },
      sE: x0 => x0.wheelDeltaX,
      sF: x0 => x0.location,
      sG: x0 => x0.click(),
      sH: x0 => x0.debugSkipFontRetryDelay,
      sI: x0 => new window.ImageDecoder(x0),
      sJ: x0 => x0.imageBitmaps,
      sK: x0 => x0.idToken,
      sL: x0 => globalThis.firebase_auth.signInAnonymously(x0),
      sM: () => globalThis.firebase_firestore.DocumentReference,
      sN: x0 => x0.projectId,
      sO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      t: (o, p, v) => o[p] = v,
      tB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      tC: x0 => x0.tabIndex,
      tD: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tE: x0 => x0.bottom,
      tF: x0 => x0.pathname,
      tG: (x0,x1) => x0.getElementsByClassName(x1),
      tH: (x0,x1,x2) => x0.set(x1,x2),
      tI: x0 => x0.name,
      tJ: x0 => x0.canvasKitMaximumSurfaces,
      tK: x0 => x0.secret,
      tL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tM: x0 => x0.path,
      tN: (x0,x1,x2,x3,x4,x5,x6,x7) => ({apiKey: x0,authDomain: x1,databaseURL: x2,projectId: x3,storageBucket: x4,messagingSenderId: x5,measurementId: x6,appId: x7}),
      tO: (x0,x1) => { x0.playbackRate = x1 },
      u: () => [],
      uB: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      uC: (x0,x1) => x0.contains(x1),
      uD: x0 => x0.matches,
      uE: x0 => x0.right,
      uF: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      uG: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      uH: x0 => x0.fontFallbackBaseUrl,
      uI: x0 => x0.repetitionCount,
      uJ: x0 => x0.nextSibling,
      uK: x0 => x0.accessToken,
      uL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      uM: x0 => x0.ref,
      uN: (x0,x1) => globalThis.firebase_core.initializeApp(x0,x1),
      uO: (x0,x1) => { x0.loop = x1 },
      v: (a, i) => a.push(i),
      vB: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      vC: x0 => x0.activeElement,
      vD: (x0,x1) => x0.matchMedia(x1),
      vE: x0 => x0.clientY,
      vF: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      vG: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      vH: (handle) => clearInterval(handle),
      vI: x0 => x0.frameCount,
      vJ: (x0,x1) => x0.debug(x1),
      vK: x0 => x0.signInMethod,
      vL: x0 => x0.hostname,
      vM: (x0,x1) => x0.get(x1),
      vN: x0 => globalThis.firebase_core.initializeApp(x0),
      vO: (x0,x1) => { x0.crossOrigin = x1 },
      w: x0 => new Int8Array(x0),
      wB: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      wC: x0 => x0.parentNode,
      wD: x0 => x0.matches,
      wE: x0 => x0.clientX,
      wF: o => Object.keys(o),
      wG: (x0,x1) => x0.dispatchEvent(x1),
      wH: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      wI: x0 => x0.selectedTrack,
      wJ: x0 => x0.hostElement,
      wK: x0 => x0.providerId,
      wL: x0 => x0.location,
      wM: (x0,x1) => globalThis.firebase_firestore.getFirestore(x0,x1),
      wN: x0 => x0.storageBucket,
      wO: (x0,x1) => { x0.preload = x1 },
      x: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      xB: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      xC: x0 => x0.tagName,
      xD: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      xE: x0 => x0.changedTouches,
      xF: x0 => x0.state,
      xG: (x0,x1) => x0.createEvent(x1),
      xH: () => Date.now(),
      xI: x0 => x0.completed,
      xJ: x0 => x0.location,
      xK: x0 => globalThis.firebase_auth.OAuthProvider.credentialFromResult(x0),
      xL: x0 => x0.name,
      xM: (x0,x1) => x0.delete(x1),
      xN: x0 => x0.databaseURL,
      xO: x0 => x0.extraAssets,
      y: x0 => new Uint8Array(x0),
      yB: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      yC: x0 => x0.target,
      yD: f => f.dartFunction,
      yE: x0 => x0.key,
      yF: x0 => x0.hash,
      yG: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      yH: (a, i) => a.splice(i, 1),
      yI: x0 => x0.ready,
      yJ: (x0,x1) => x0.getModifierState(x1),
      yK: x0 => x0.username,
      yL: x0 => new firebase_firestore.FieldPath(x0),
      yM: x0 => x0.commit(),
      yN: x0 => x0.apiKey,
      yO: x0 => x0.fontManifest,
      z: x0 => new Uint8ClampedArray(x0),
      zB: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      zC: x0 => x0.clientY,
      zD: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      zE: x0 => x0.identifier,
      zF: x0 => x0.state,
      zG: x0 => x0.readText(),
      zH: a => a.pop(),
      zI: x0 => x0.tracks,
      zJ: x0 => x0.metaKey,
      zK: x0 => x0.providerId,
      zL: (x0,x1) => new firebase_firestore.FieldPath(x0,x1),
      zM: x0 => globalThis.firebase_firestore.writeBatch(x0),
      zN: x0 => x0.options,
      zO: x0 => x0.assetManifest,

    };

    const baseImports = {
      _: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
    });

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
