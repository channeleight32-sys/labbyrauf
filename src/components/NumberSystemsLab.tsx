import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

function toBCD(n: number): string {
  if (n < 0 || n > 255) return "N/A";
  return n
    .toString(10)
    .split("")
    .map((d) => parseInt(d, 10).toString(2).padStart(4, "0"))
    .join(" ");
}

function toExcess3(n: number): string {
  if (n < 0 || n > 255) return "N/A";
  return n
    .toString(10)
    .split("")
    .map((d) => (parseInt(d, 10) + 3).toString(2).padStart(4, "0"))
    .join(" ");
}

export default function NumberSystemsLab() {
  // 8-bit unsigned value (0..255)
  const [byteVal, setByteVal] = useState<number>(42);

  // Signed 8-bit 2's complement arithmetic
  const [numA, setNumA] = useState<number>(58);
  const [numB, setNumB] = useState<number>(-23);
  const [opMode, setOpMode] = useState<"ADD" | "SUB">("ADD");

  // Hamming(7,4) state: 4 data bits [D3, D5, D6, D7]
  const [hammingData, setHammingData] = useState<[number, number, number, number]>([
    1, 0, 1, 1,
  ]);
  const [corruptedBitPos, setCorruptedBitPos] = useState<number | null>(null); // 1..7

  const bits8 = Array.from({ length: 8 }, (_, i) => (byteVal >> (7 - i)) & 1);
  const grayVal = byteVal ^ (byteVal >> 1);
  const grayBits = Array.from({ length: 8 }, (_, i) => (grayVal >> (7 - i)) & 1);

  const signed2s = byteVal >= 128 ? byteVal - 256 : byteVal;
  const signed1s = byteVal >= 128 ? -(255 - byteVal) : byteVal;
  const signMag =
    byteVal >= 128 ? -(byteVal & 0x7f) : byteVal;

  const evenParityBit = bits8.reduce((acc, b) => acc ^ b, 0);

  // 8-bit 2's complement arithmetic calculation
  const clamp8 = (v: number) => Math.max(-128, Math.min(127, v));
  const aClamped = clamp8(numA);
  const bClamped = clamp8(numB);
  const aByte = aClamped < 0 ? 256 + aClamped : aClamped;
  const bRawByte = bClamped < 0 ? 256 + bClamped : bClamped;
  const bOperandByte = opMode === "SUB" ? bRawByte ^ 0xff : bRawByte;
  const cin = opMode === "SUB" ? 1 : 0;

  // Bit-by-bit carry propagation
  const carries: number[] = [cin];
  const sumBits: number[] = [];
  for (let i = 0; i < 8; i++) {
    const ai = (aByte >> i) & 1;
    const bi = (bOperandByte >> i) & 1;
    const c = carries[i];
    sumBits.push(ai ^ bi ^ c);
    carries.push((ai & bi) | (c & (ai ^ bi)));
  }

  const resultByte = sumBits.reduce((acc, b, idx) => acc | (b << idx), 0);
  const resultSigned = resultByte >= 128 ? resultByte - 256 : resultByte;
  const c7 = carries[7];
  const c8 = carries[8];
  const overflowFlag = c7 ^ c8;

  // Hamming(7,4) calculation (Bit positions 1..7: P1, P2, D3, P4, D5, D6, D7)
  const [d3, d5, d6, d7] = hammingData;
  const p1 = d3 ^ d5 ^ d7;
  const p2 = d3 ^ d6 ^ d7;
  const p4 = d5 ^ d6 ^ d7;
  const transmitted = [p1, p2, d3, p4, d5, d6, d7];
  const received = transmitted.map((b, idx) =>
    corruptedBitPos === idx + 1 ? b ^ 1 : b
  );

  const s1 = received[0] ^ received[2] ^ received[4] ^ received[6];
  const s2 = received[1] ^ received[2] ^ received[5] ^ received[6];
  const s4 = received[3] ^ received[4] ^ received[5] ^ received[6];
  const syndrome = (s4 << 2) | (s2 << 1) | s1;

  return (
    <div className="space-y-10">
      {/* Section 1: Interactive 8-Bit Register, Base Converter & Code Translator */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">
              01. Multi-Base Converter, Signed Representations &amp; Binary Codes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any bit in the 8-bit register or enter a value to inspect
              Binary, Octal, Hexadecimal, BCD, Excess-3, Gray Code, and Signed
              encodings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-400">
              Unsigned Byte (0–255):
            </label>
            <input
              type="number"
              min={0}
              max={255}
              value={byteVal}
              onChange={(e) => {
                const v = Math.max(
                  0,
                  Math.min(255, parseInt(e.target.value || "0", 10))
                );
                setByteVal(v);
              }}
              className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Interactive 8-Bit Toggle Bar */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          {bits8.map((bit, idx) => {
            const weight = 1 << (7 - idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setByteVal((v) => v ^ weight)}
                className={`p-3 rounded-xl border font-mono transition-colors cursor-pointer flex flex-col items-center gap-1 ${
                  bit === 1
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <span className="text-[10px] text-slate-500">
                  b{7 - idx} (2^{7 - idx}={weight})
                </span>
                <span className="text-2xl font-bold">{bit}</span>
                <span className="text-[10px]">
                  {bit === 1 ? "HIGH" : "LOW"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Radix & Code Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400">Radix Representations</div>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Binary (Base 2):</span>
                <span className="text-cyan-300 font-bold">
                  {byteVal.toString(2).padStart(8, "0")}₂
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Octal (Base 8):</span>
                <span className="text-white font-bold">
                  {byteVal.toString(8).padStart(3, "0")}₈
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Decimal (Base 10):</span>
                <span className="text-emerald-400 font-bold">{byteVal}₁₀</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hexadecimal (16):</span>
                <span className="text-amber-300 font-bold">
                  0x{byteVal.toString(16).toUpperCase().padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400">
              Signed 8-Bit Interpretation (MSB = Sign)
            </div>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">2&apos;s Complement:</span>
                <span className="text-emerald-400 font-bold">{signed2s}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">1&apos;s Complement:</span>
                <span className="text-cyan-300 font-bold">
                  {byteVal === 255 ? "-0" : signed1s}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sign-Magnitude:</span>
                <span className="text-white font-bold">
                  {byteVal === 128 ? "-0" : signMag}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Even Parity Bit:</span>
                <span className="text-amber-300 font-bold">
                  P = {evenParityBit}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400">
              BCD (8421) &amp; Excess-3 Codes
            </div>
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <div className="text-slate-400 text-[11px]">
                  8421 BCD (4 bits/digit):
                </div>
                <div className="text-cyan-300 font-bold mt-0.5">
                  {toBCD(byteVal)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">
                  Excess-3 (BCD + 0011₂):
                </div>
                <div className="text-amber-300 font-bold mt-0.5">
                  {toExcess3(byteVal)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400">
              Reflected Gray Code (G = B ⊕ (B &gt;&gt; 1))
            </div>
            <div className="mt-2 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Binary:</span>
                <span className="text-slate-200">{bits8.join("")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gray Code:</span>
                <span className="text-emerald-400 font-bold">
                  {grayBits.join("")}
                </span>
              </div>
              <p className="text-[11px] font-sans text-slate-400 pt-1">
                Adjacent Gray code words differ by strictly 1 bit, eliminating
                switching glitches in rotary encoders and K-Maps.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: 2's Complement Adder/Subtractor + Hamming(7,4) SEC Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 2's Complement Adder/Subtractor & Overflow Inspector */}
        <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">
              02. 8-Bit 2&apos;s Complement Adder/Subtractor &amp; Overflow Flag
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hardware performs subtraction via{" "}
              <code className="text-cyan-400">A - B = A + B&apos; + 1</code>.
              Signed overflow occurs when{" "}
              <code className="text-amber-300">V = C7 ⊕ C8 = 1</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">A:</span>
              <input
                type="number"
                min={-128}
                max={127}
                value={numA}
                onChange={(e) =>
                  setNumA(parseInt(e.target.value || "0", 10))
                }
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {(["ADD", "SUB"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setOpMode(m)}
                  className={`px-3 py-1 rounded text-xs font-mono font-semibold cursor-pointer ${
                    opMode === m
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m === "ADD" ? "A + B" : "A - B"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">B:</span>
              <input
                type="number"
                min={-128}
                max={127}
                value={numB}
                onChange={(e) =>
                  setNumB(parseInt(e.target.value || "0", 10))
                }
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white"
              />
            </div>
          </div>

          {/* Bitwise Alignment Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Carries (C8..C0):</span>
              <span className="text-amber-300 tracking-widest">
                {carries
                  .slice()
                  .reverse()
                  .join("")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">
                Operand A ({aClamped >= 0 ? `+${aClamped}` : aClamped}):
              </span>
              <span className="text-cyan-300 tracking-widest">
                {aByte.toString(2).padStart(8, "0")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">
                {opMode === "SUB"
                  ? `B' (1's Comp of ${bClamped}) + Cin=1:`
                  : `Operand B (${bClamped >= 0 ? `+${bClamped}` : bClamped}):`}
              </span>
              <span className="text-cyan-300 tracking-widest">
                {bOperandByte.toString(2).padStart(8, "0")}
              </span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between font-bold">
              <span className="text-white">8-Bit Result S7..S0:</span>
              <span className="text-emerald-400 tracking-widest">
                {resultByte.toString(2).padStart(8, "0")} ({resultSigned})
              </span>
            </div>
          </div>

          {/* Status Flags */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-400">Sign Flag (N)</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {(resultByte >> 7) & 1}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-400">Zero Flag (Z)</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {resultByte === 0 ? 1 : 0}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-400">Carry Out (C8)</div>
              <div className="text-sm font-bold text-cyan-300 mt-0.5">{c8}</div>
            </div>
            <div
              className={`border rounded-lg p-2.5 text-center ${
                overflowFlag === 1
                  ? "bg-rose-950/50 border-rose-500/60 text-rose-300"
                  : "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
              }`}
            >
              <div className="text-[10px]">Overflow (V=C7⊕C8)</div>
              <div className="text-sm font-bold mt-0.5">
                {overflowFlag} ({overflowFlag ? "OVERFLOW" : "VALID"})
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive Hamming(7,4) Error Detection & Correction Lab */}
        <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-white">
                03. Hamming(7,4) Error-Correcting Code Simulator
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle the 4 data bits, then click any of the 7 transmitted bits
                to simulate a single-bit channel error.
              </p>
            </div>
            {corruptedBitPos !== null && (
              <button
                type="button"
                onClick={() => setCorruptedBitPos(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Clear Error
              </button>
            )}
          </div>

          {/* Step 1: 4 Data Bits */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">
              Step 1: Select 4-Bit Data Word (D3, D5, D6, D7)
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {(["D3", "D5", "D6", "D7"] as const).map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setHammingData((prev) => {
                      const next = [...prev] as [
                        number,
                        number,
                        number,
                        number
                      ];
                      next[idx] ^= 1;
                      return next;
                    })
                  }
                  className={`py-2 px-3 rounded-lg font-mono text-xs font-bold border transition-colors cursor-pointer ${
                    hammingData[idx] === 1
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {label} = {hammingData[idx]}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: 7-Bit Transmitted Codeword (Click to Inject Error) */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">
              Step 2: 7-Bit Channel Codeword — Click Any Bit to Inject Noise!
            </div>
            <div className="grid grid-cols-7 gap-1.5 font-mono">
              {[
                { pos: 1, name: "P1", isParity: true },
                { pos: 2, name: "P2", isParity: true },
                { pos: 3, name: "D3", isParity: false },
                { pos: 4, name: "P4", isParity: true },
                { pos: 5, name: "D5", isParity: false },
                { pos: 6, name: "D6", isParity: false },
                { pos: 7, name: "D7", isParity: false },
              ].map((item, idx) => {
                const isCorrupted = corruptedBitPos === item.pos;
                const val = received[idx];
                return (
                  <button
                    key={item.pos}
                    type="button"
                    onClick={() =>
                      setCorruptedBitPos((prev) =>
                        prev === item.pos ? null : item.pos
                      )
                    }
                    className={`p-2.5 rounded-lg border text-center transition-colors cursor-pointer ${
                      isCorrupted
                        ? "bg-rose-500/25 border-rose-500 text-rose-200"
                        : item.isParity
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-200 hover:border-amber-400"
                        : "bg-slate-900 border-slate-800 text-slate-200 hover:border-cyan-400"
                    }`}
                  >
                    <div className="text-[10px] opacity-75">
                      Bit {item.pos} ({item.name})
                    </div>
                    <div className="text-lg font-bold mt-0.5">{val}</div>
                    <div className="text-[9px]">
                      {isCorrupted ? "FLIPPED" : item.isParity ? "PARITY" : "DATA"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Receiver Syndrome & Automatic Correction */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Syndrome (S4 S2 S1) ={" "}
                <strong className="text-cyan-300">
                  {s4}
                  {s2}
                  {s1}₂ = {syndrome}₁₀
                </strong>
              </span>
              {syndrome === 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  NO ERROR DETECTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ERROR AT BIT #{syndrome} — AUTO-CORRECTED
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              Parity equations: <code>P1 = D3⊕D5⊕D7 = {p1}</code> ·{" "}
              <code>P2 = D3⊕D6⊕D7 = {p2}</code> ·{" "}
              <code>P4 = D5⊕D6⊕D7 = {p4}</code>. Inverting bit #{syndrome || "none"}{" "}
              restores the original codeword{" "}
              <code className="text-emerald-400">{transmitted.join("")}</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
