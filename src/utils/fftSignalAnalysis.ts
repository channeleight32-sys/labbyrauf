export type FftWindowType = "hann" | "hamming" | "blackman" | "rectangular";

export interface FftFrequencyBin {
  index: number;
  freqHz: number;
  magVpk: number;
  magVrms: number;
  magDbv: number;
}

export interface FftHarmonicPeak {
  order: number;
  label: string;
  freqHz: number;
  magVpk: number;
  magDbv: number;
  relDbc: number;
}

export interface FftAnalysisResult {
  valid: boolean;
  sampleCount: number;
  fftSize: number;
  sampleRateHz: number;
  nyquistHz: number;
  binResolutionHz: number;
  dcOffsetV: number;
  acRmsV: number;
  vpp: number;
  fundamentalFreqHz: number;
  fundamentalMagVpk: number;
  fundamentalMagDbv: number;
  thdPercent: number;
  sfdrDb: number;
  noiseFloorDbv: number;
  bins: FftFrequencyBin[];
  harmonics: FftHarmonicPeak[];
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function getWindowWeights(length: number, windowType: FftWindowType): Float64Array {
  const w = new Float64Array(length);
  if (length <= 1) {
    if (length === 1) w[0] = 1;
    return w;
  }
  const denom = length - 1;
  for (let i = 0; i < length; i++) {
    const r = (2 * Math.PI * i) / denom;
    switch (windowType) {
      case "hann":
        w[i] = 0.5 * (1 - Math.cos(r));
        break;
      case "hamming":
        w[i] = 0.54 - 0.46 * Math.cos(r);
        break;
      case "blackman":
        w[i] = 0.42 - 0.5 * Math.cos(r) + 0.08 * Math.cos(2 * r);
        break;
      case "rectangular":
      default:
        w[i] = 1;
        break;
    }
  }
  return w;
}

/**
 * In-place iterative Cooley-Tukey radix-2 FFT.
 * `re` and `im` must have length equal to a power of 2.
 */
function radix2Fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tr = re[i];
      const ti = im[i];
      re[i] = re[j];
      im[i] = im[j];
      re[j] = tr;
      im[j] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Butterfly stages
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const angleStep = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const angle = k * angleStep;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);
        const evenIdx = start + k;
        const oddIdx = evenIdx + half;

        const tr = wr * re[oddIdx] - wi * im[oddIdx];
        const ti = wr * im[oddIdx] + wi * re[oddIdx];

        re[oddIdx] = re[evenIdx] - tr;
        im[oddIdx] = im[evenIdx] - ti;
        re[evenIdx] += tr;
        im[evenIdx] += ti;
      }
    }
  }
}

export function formatFrequencyHz(hz: number): string {
  if (!Number.isFinite(hz) || hz <= 0) return "0 Hz";
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`;
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(2)} kHz`;
  if (hz >= 10) return `${hz.toFixed(1)} Hz`;
  return `${hz.toFixed(2)} Hz`;
}

export function computeFftSpectrum(
  rawSamples: number[],
  sampleRateHz: number,
  options?: {
    windowType?: FftWindowType;
    removeDc?: boolean;
    minFftSize?: number;
    maxFftSize?: number;
  }
): FftAnalysisResult {
  const windowType = options?.windowType ?? "hann";
  const removeDc = options?.removeDc ?? true;
  const minFftSize = options?.minFftSize ?? 256;
  const maxFftSize = options?.maxFftSize ?? 1024;

  const clean = rawSamples.filter((v) => Number.isFinite(v));
  const L = clean.length;

  if (L < 4 || !Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    return {
      valid: false,
      sampleCount: L,
      fftSize: 0,
      sampleRateHz: Math.max(0, sampleRateHz || 0),
      nyquistHz: Math.max(0, (sampleRateHz || 0) / 2),
      binResolutionHz: 0,
      dcOffsetV: 0,
      acRmsV: 0,
      vpp: 0,
      fundamentalFreqHz: 0,
      fundamentalMagVpk: 0,
      fundamentalMagDbv: -120,
      thdPercent: 0,
      sfdrDb: 0,
      noiseFloorDbv: -120,
      bins: [],
      harmonics: [],
    };
  }

  let sum = 0;
  let minV = Infinity;
  let maxV = -Infinity;
  for (let i = 0; i < L; i++) {
    const v = clean[i];
    sum += v;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const dcOffsetV = sum / L;
  const vpp = maxV - minV;

  let acSqSum = 0;
  for (let i = 0; i < L; i++) {
    const ac = clean[i] - dcOffsetV;
    acSqSum += ac * ac;
  }
  const acRmsV = Math.sqrt(acSqSum / L);

  // Zero-pad windowed signal for crisp spectral interpolation without altering peak frequencies
  const targetN = Math.min(maxFftSize, Math.max(minFftSize, nextPowerOfTwo(L * 2)));
  const fftSize = nextPowerOfTwo(targetN);

  const weights = getWindowWeights(L, windowType);
  let weightSum = 0;
  for (let i = 0; i < L; i++) weightSum += weights[i];
  const coherentGain = weightSum / L || 1;

  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);

  for (let i = 0; i < L; i++) {
    const val = removeDc ? clean[i] - dcOffsetV : clean[i];
    re[i] = val * weights[i];
  }

  radix2Fft(re, im);

  const halfBins = Math.floor(fftSize / 2);
  const binResolutionHz = sampleRateHz / fftSize;
  const nyquistHz = sampleRateHz / 2;
  const normBase = L * coherentGain;

  const bins: FftFrequencyBin[] = new Array(halfBins + 1);
  for (let k = 0; k <= halfBins; k++) {
    const mag = Math.hypot(re[k], im[k]);
    const scale = k === 0 || k === halfBins ? 1 : 2;
    const magVpk = (scale * mag) / normBase;
    const magVrms = k === 0 ? magVpk : magVpk / Math.SQRT2;
    const magDbv = 20 * Math.log10(Math.max(magVrms, 1e-6));
    bins[k] = {
      index: k,
      freqHz: k * binResolutionHz,
      magVpk,
      magVrms,
      magDbv,
    };
  }

  // Locate dominant fundamental peak above DC leakage band
  const minSearchBin = removeDc ? 2 : 1;
  let peakBin = minSearchBin;
  let peakVal = -1;
  for (let k = minSearchBin; k < halfBins; k++) {
    if (bins[k].magVpk > peakVal) {
      peakVal = bins[k].magVpk;
      peakBin = k;
    }
  }

  // Parabolic interpolation around peakBin for sub-bin frequency precision
  let refinedBin = peakBin;
  if (peakBin > 1 && peakBin < halfBins - 1) {
    const y0 = bins[peakBin - 1].magVpk;
    const y1 = bins[peakBin].magVpk;
    const y2 = bins[peakBin + 1].magVpk;
    const denom = y0 - 2 * y1 + y2;
    if (Math.abs(denom) > 1e-12) {
      const delta = (0.5 * (y0 - y2)) / denom;
      if (Math.abs(delta) <= 1) {
        refinedBin = peakBin + delta;
      }
    }
  }

  const fundamentalFreqHz = acRmsV > 1e-5 ? Math.max(0, refinedBin * binResolutionHz) : 0;
  const fundamentalMagVpk = acRmsV > 1e-5 ? bins[peakBin]?.magVpk ?? 0 : 0;
  const fundamentalMagDbv = acRmsV > 1e-5 ? bins[peakBin]?.magDbv ?? -120 : -120;

  // Detect harmonics 2*f1 .. 7*f1 within Nyquist
  const harmonics: FftHarmonicPeak[] = [];
  if (fundamentalFreqHz > 0 && fundamentalMagVpk > 1e-5) {
    harmonics.push({
      order: 1,
      label: "f₁",
      freqHz: fundamentalFreqHz,
      magVpk: fundamentalMagVpk,
      magDbv: fundamentalMagDbv,
      relDbc: 0,
    });

    const mainLobeRadiusBins = windowType === "blackman" ? 4 : windowType === "rectangular" ? 2 : 3;
    for (let order = 2; order <= 7; order++) {
      const targetFreq = fundamentalFreqHz * order;
      if (targetFreq >= nyquistHz * 0.98) break;
      const centerBin = Math.round(targetFreq / binResolutionHz);
      const lo = Math.max(minSearchBin, centerBin - mainLobeRadiusBins);
      const hi = Math.min(halfBins - 1, centerBin + mainLobeRadiusBins);

      let bestK = centerBin;
      let bestMag = -1;
      for (let k = lo; k <= hi; k++) {
        if (bins[k].magVpk > bestMag) {
          bestMag = bins[k].magVpk;
          bestK = k;
        }
      }

      if (bestMag > 0) {
        const dbv = bins[bestK].magDbv;
        harmonics.push({
          order,
          label: `${order}f₁`,
          freqHz: bins[bestK].freqHz,
          magVpk: bestMag,
          magDbv: dbv,
          relDbc: dbv - fundamentalMagDbv,
        });
      }
    }
  }

  // Compute THD (%) from detected harmonics >= 2
  let harmonicSqSum = 0;
  for (const h of harmonics) {
    if (h.order >= 2) {
      harmonicSqSum += h.magVpk * h.magVpk;
    }
  }
  const thdPercent =
    fundamentalMagVpk > 1e-5 ? (Math.sqrt(harmonicSqSum) / fundamentalMagVpk) * 100 : 0;

  // Compute SFDR (Spurious-Free Dynamic Range) & median noise floor
  let maxSpurDbv = -120;
  const lobeGuard = windowType === "blackman" ? 4 : 3;
  const dbvList: number[] = [];
  for (let k = minSearchBin; k < halfBins; k++) {
    dbvList.push(bins[k].magDbv);
    if (Math.abs(k - peakBin) > lobeGuard) {
      if (bins[k].magDbv > maxSpurDbv) {
        maxSpurDbv = bins[k].magDbv;
      }
    }
  }
  dbvList.sort((a, b) => a - b);
  const noiseFloorDbv = dbvList.length > 0 ? dbvList[Math.floor(dbvList.length * 0.5)] : -120;
  const sfdrDb =
    fundamentalMagVpk > 1e-5 && maxSpurDbv > -119
      ? Math.max(0, fundamentalMagDbv - maxSpurDbv)
      : 0;

  return {
    valid: true,
    sampleCount: L,
    fftSize,
    sampleRateHz,
    nyquistHz,
    binResolutionHz,
    dcOffsetV,
    acRmsV,
    vpp,
    fundamentalFreqHz,
    fundamentalMagVpk,
    fundamentalMagDbv,
    thdPercent,
    sfdrDb,
    noiseFloorDbv,
    bins,
    harmonics,
  };
}
