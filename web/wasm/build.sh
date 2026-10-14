#!/bin/sh
# Builds Swiss Ephemeris (Moshier mode, no data files) to WebAssembly.
# The C sources are taken from the pyswisseph 2.10.3.2 sdist, the exact
# library used by the Python toolkit, so both engines share one code base.
# Run from web/wasm:  docker run --rm -v "$PWD:/src" -w /src emscripten/emsdk:6.0.12 sh build.sh
# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
set -eu
SDIST_URL="https://files.pythonhosted.org/packages/source/p/pyswisseph/pyswisseph-2.10.3.2.tar.gz"
SDIST_SHA256="c54c305e83dbd5d2b71e58d8a69d8ee41de24c4d3328ce09e2af860a3537624d"
WORK=/tmp/swe
rm -rf "$WORK" && mkdir -p "$WORK"
if [ -f /src/pyswisseph-2.10.3.2.tar.gz ]; then cp /src/pyswisseph-2.10.3.2.tar.gz "$WORK/"; else curl -sSL "$SDIST_URL" -o "$WORK/pyswisseph-2.10.3.2.tar.gz"; fi
echo "$SDIST_SHA256  $WORK/pyswisseph-2.10.3.2.tar.gz" | sha256sum -c -
tar -xzf "$WORK/pyswisseph-2.10.3.2.tar.gz" -C "$WORK"
L="$WORK/pyswisseph-2.10.3.2/libswe"
emcc -O3 -flto \
  "$L/swecl.c" "$L/swedate.c" "$L/swehel.c" "$L/swehouse.c" "$L/swejpl.c" \
  "$L/swemmoon.c" "$L/swemplan.c" "$L/sweph.c" "$L/swephlib.c" \
  -o swisseph.mjs \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createSwissEph \
  -sENVIRONMENT=web,worker,node -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS=_malloc,_free,_swe_calc_ut,_swe_houses_ex,_swe_rise_trans,_swe_sidtime,_swe_utc_to_jd,_swe_jdut1_to_utc,_swe_julday,_swe_revjul,_swe_set_sid_mode,_swe_get_ayanamsa_ex_ut,_swe_version,_swe_deltat_ex \
  -sEXPORTED_RUNTIME_METHODS=cwrap,getValue,setValue,UTF8ToString,HEAPF64,HEAP32
sha256sum swisseph.wasm swisseph.mjs > SHA256SUMS
emcc --version | head -1 > EMCC_VERSION
ls -l swisseph.wasm swisseph.mjs
