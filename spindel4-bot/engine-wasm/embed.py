"""Puts spindel.wasm (base64) into spindel4-robot.user.js. Run after build.sh."""
import base64, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
wasm = open(os.path.join(HERE, "spindel.wasm"), "rb").read()
b64 = base64.b64encode(wasm).decode()
p = os.path.join(HERE, "..", "spindel4-robot.user.js")
s = open(p, encoding="utf-8").read()
s2, n = re.subn(r'/\*WASM-B64\*/"[^"]*"/\*WASM-END\*/', '/*WASM-B64*/"' + b64 + '"/*WASM-END*/', s)
assert n == 1, "marker not found"
open(p, "w", encoding="utf-8").write(s2)
print("embedded %d bytes of WebAssembly" % len(wasm))
