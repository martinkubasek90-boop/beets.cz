/**
 * WAV to Akai MPC 3000 SND Converter
 * Based on verified MPC 3000 SND format specification (38-byte header)
 */

// Build MPC 3000 SND header (38 bytes)
function buildMPC3000SndHeader(
  numSamples: number,
  sampleName: string,
  sampleRate = 44100,
  numChannels = 1
) {
  const hdr = new Uint8Array(38);
  const view = new DataView(hdr.buffer);

  hdr[0] = 0x01;
  hdr[1] = 0x02;

  const name = (sampleName || 'SAMPLE00').toUpperCase().substring(0, 8).padEnd(8, ' ');
  for (let i = 0; i < 8; i += 1) {
    hdr[2 + i] = name.charCodeAt(i);
  }

  for (let i = 0; i < 8; i += 1) {
    hdr[10 + i] = 0x20;
  }

  hdr[18] = 0x00;
  hdr[19] = 0x64;
  hdr[20] = 0x00;
  hdr[21] = 0x00;

  view.setUint32(22, 44, true);
  view.setUint32(26, numSamples, true);
  view.setUint32(30, numSamples, true);
  view.setUint16(34, sampleRate, true);
  view.setUint16(36, numChannels, true);

  return hdr;
}

function stereoToMono(audioData: Uint8Array, bitsPerSample: number) {
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = audioData.length / (bytesPerSample * 2);
  const monoData = new Uint8Array(numSamples * bytesPerSample);
  const view = new DataView(audioData.buffer, audioData.byteOffset, audioData.byteLength);
  const monoView = new DataView(monoData.buffer);

  for (let i = 0; i < numSamples; i += 1) {
    let left: number;
    let right: number;
    let avg: number;
    const srcOffset = i * bytesPerSample * 2;
    const dstOffset = i * bytesPerSample;

    if (bitsPerSample === 16) {
      left = view.getInt16(srcOffset, true);
      right = view.getInt16(srcOffset + 2, true);
      avg = Math.round((left + right) / 2);
      monoView.setInt16(dstOffset, avg, true);
    } else if (bitsPerSample === 24) {
      left = audioData[srcOffset] | (audioData[srcOffset + 1] << 8) | (audioData[srcOffset + 2] << 16);
      if (left & 0x800000) left |= 0xff000000;
      right = audioData[srcOffset + 3] | (audioData[srcOffset + 4] << 8) | (audioData[srcOffset + 5] << 16);
      if (right & 0x800000) right |= 0xff000000;
      avg = Math.round((left + right) / 2);
      monoData[dstOffset] = avg & 0xff;
      monoData[dstOffset + 1] = (avg >> 8) & 0xff;
      monoData[dstOffset + 2] = (avg >> 16) & 0xff;
    }
  }

  return monoData;
}

function convert24To16Bit(audioData: Uint8Array) {
  const numSamples = audioData.length / 3;
  const output = new Uint8Array(numSamples * 2);
  const outView = new DataView(output.buffer);

  for (let i = 0; i < numSamples; i += 1) {
    const srcOffset = i * 3;
    let sample = audioData[srcOffset] | (audioData[srcOffset + 1] << 8) | (audioData[srcOffset + 2] << 16);
    if (sample & 0x800000) {
      sample -= 0x1000000;
    }
    const sample16 = sample >> 8;
    outView.setInt16(i * 2, sample16, true);
  }

  return output;
}

async function parseWavFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);

  const riff = String.fromCharCode(uint8[0], uint8[1], uint8[2], uint8[3]);
  if (riff !== 'RIFF') {
    throw new Error('Invalid WAV file: Missing RIFF header');
  }

  const wave = String.fromCharCode(uint8[8], uint8[9], uint8[10], uint8[11]);
  if (wave !== 'WAVE') {
    throw new Error('Invalid WAV file: Missing WAVE format');
  }

  let offset = 12;
  let fmtChunk: {
    audioFormat: number;
    numChannels: number;
    sampleRate: number;
    byteRate: number;
    blockAlign: number;
    bitsPerSample: number;
  } | null = null;
  let dataChunk: { offset: number; size: number } | null = null;

  while (offset < arrayBuffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      uint8[offset],
      uint8[offset + 1],
      uint8[offset + 2],
      uint8[offset + 3]
    );
    const chunkSize = dataView.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      fmtChunk = {
        audioFormat: dataView.getUint16(offset + 8, true),
        numChannels: dataView.getUint16(offset + 10, true),
        sampleRate: dataView.getUint32(offset + 12, true),
        byteRate: dataView.getUint32(offset + 16, true),
        blockAlign: dataView.getUint16(offset + 20, true),
        bitsPerSample: dataView.getUint16(offset + 22, true),
      };
    } else if (chunkId === 'data') {
      dataChunk = {
        offset: offset + 8,
        size: chunkSize,
      };
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset += 1;
  }

  if (!fmtChunk) throw new Error('Invalid WAV: Missing fmt chunk');
  if (!dataChunk) throw new Error('Invalid WAV: Missing data chunk');
  if (fmtChunk.audioFormat !== 1) throw new Error('Only PCM WAV files supported');
  if (![16, 24].includes(fmtChunk.bitsPerSample)) {
    throw new Error(`Only 16-bit and 24-bit WAV files supported. Your file is ${fmtChunk.bitsPerSample}-bit.`);
  }

  let audioData = new Uint8Array(arrayBuffer, dataChunk.offset, dataChunk.size);
  let numChannels = fmtChunk.numChannels;
  let bitsPerSample = fmtChunk.bitsPerSample;

  if (numChannels === 2) {
    audioData = stereoToMono(audioData, bitsPerSample);
    numChannels = 1;
  } else if (numChannels !== 1) {
    throw new Error(`Only mono or stereo WAV files supported. Your file has ${numChannels} channels.`);
  }

  if (bitsPerSample === 24) {
    audioData = convert24To16Bit(audioData);
    bitsPerSample = 16;
  }

  const numFrames = audioData.length / 2;

  return {
    format: { ...fmtChunk, bitsPerSample: 16, numChannels: 1 },
    audioData,
    numFrames,
  };
}

export async function convertWavToSnd(file: File) {
  const wavData = await parseWavFile(file);
  const { format, audioData, numFrames } = wavData;

  const sampleName = file.name.replace(/\.[^/.]+$/, '').substring(0, 8);
  const header = buildMPC3000SndHeader(numFrames, sampleName, format.sampleRate, 1);

  const sndFile = new Uint8Array(header.length + audioData.length);
  sndFile.set(header, 0);
  sndFile.set(audioData, header.length);

  const blob = new Blob([sndFile], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    filename: sampleName.toUpperCase().substring(0, 8) + '.SND',
    sampleRate: format.sampleRate,
    numSamples: numFrames,
  };
}

export async function batchConvertWavToSnd(
  files: Array<{ id: string; file: File; name: string }>,
  onProgress?: (id: string, status: string, result?: unknown, error?: string) => void
) {
  const results = [];

  for (const file of files) {
    try {
      onProgress?.(file.id, 'converting');
      const result = await convertWavToSnd(file.file);
      results.push({ ...result, id: file.id, originalName: file.name, status: 'completed' });
      onProgress?.(file.id, 'completed', result);
    } catch (error: any) {
      results.push({ id: file.id, originalName: file.name, status: 'error', error: error.message });
      onProgress?.(file.id, 'error', null, error.message);
    }
  }

  return results;
}

export function downloadSndFile(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  for (let i = 0; i < data.length; i += 1) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function createZipDownload(convertedFiles: Array<{ blob?: Blob; filename: string }>, programName = 'MPC3000') {
  const files = convertedFiles.filter((f) => f.blob);

  const localHeaders: Array<{ header: Uint8Array; data: Uint8Array }> = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const data = new Uint8Array(await file.blob!.arrayBuffer());
    const filename = new TextEncoder().encode(file.filename);

    const localHeader = new Uint8Array(30 + filename.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc32(data), true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, filename.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(filename, 30);

    const centralHeader = new Uint8Array(46 + filename.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc32(data), true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, filename.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(filename, 46);

    localHeaders.push({ header: localHeader, data });
    centralHeaders.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  const totalSize = offset + centralDirSize + 22;
  const zipData = new Uint8Array(totalSize);
  let pos = 0;

  for (const { header, data } of localHeaders) {
    zipData.set(header, pos);
    pos += header.length;
    zipData.set(data, pos);
    pos += data.length;
  }
  for (const header of centralHeaders) {
    zipData.set(header, pos);
    pos += header.length;
  }
  zipData.set(endRecord, pos);

  const blob = new Blob([zipData], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  downloadSndFile(url, `${programName}_SND.zip`);
  URL.revokeObjectURL(url);
}

export function buildMPC3000Program(samples: string[], programName = 'PROGRAM1') {
  const totalSize = 4608;
  const pgm = new Uint8Array(totalSize);
  const view = new DataView(pgm.buffer);

  pgm[0x00] = 0x07;
  pgm[0x01] = 0x04;
  pgm[0x02] = 0x11;
  pgm[0x03] = 0x00;

  const maxSamples = Math.min(samples.length, 17);
  for (let i = 0; i < maxSamples; i += 1) {
    const slotOffset = 0x00c0 + i * 16;
    const sampleName = samples[i].replace(/\.[^/.]+$/, '').toUpperCase().substring(0, 16).padEnd(16, ' ');
    for (let j = 0; j < 16; j += 1) {
      pgm[slotOffset + j] = sampleName.charCodeAt(j);
    }
  }

  for (let pad = 0; pad < maxSamples; pad += 1) {
    const recOffset = 0x0300 + pad * 24;

    view.setUint16(recOffset + 0, pad, true);
    pgm[recOffset + 2] = 0x2c;
    pgm[recOffset + 3] = 0x22;
    pgm[recOffset + 4] = 0x58;
    pgm[recOffset + 5] = 0x22;
    pgm[recOffset + 6] = 0x00;
    pgm[recOffset + 7] = 0x22;
    pgm[recOffset + 8] = 0x22;
    pgm[recOffset + 9] = 0x00;
    view.setUint16(recOffset + 10, 0, true);
    view.setUint16(recOffset + 12, 6, true);
    view.setUint16(recOffset + 14, 100, true);
    view.setUint16(recOffset + 16, 0, true);
    view.setUint16(recOffset + 18, 25600, true);
    view.setUint16(recOffset + 20, 0, true);
    view.setUint16(recOffset + 22, 0, true);
  }

  const blob = new Blob([pgm], { type: 'application/octet-stream' });
  return {
    blob,
    url: URL.createObjectURL(blob),
    filename: programName.toUpperCase().substring(0, 8) + '.PGM',
  };
}

function getPadBankLabel(index: number) {
  const banks = ['A', 'B', 'C', 'D'];
  const bank = banks[Math.floor(index / 16)];
  const padNum = (index % 16) + 1;
  return `${bank}${padNum}`;
}

export { getPadBankLabel };
