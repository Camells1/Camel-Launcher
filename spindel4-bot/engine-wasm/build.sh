#!/bin/sh
# Builds spindel.wasm (needs clang with the wasm32 target and wasm-ld).
cd "$(dirname "$0")"
clang --target=wasm32 -O3 -nostdlib -fno-builtin -mbulk-memory \
  -Wl,--no-entry -Wl,--allow-undefined -Wl,--export-memory -Wl,--initial-memory=33554432 \
  -o spindel.wasm spindel.c
ls -la spindel.wasm
