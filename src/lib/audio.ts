/**
 * Voice capture for Kisan Mitra. MediaRecorder output differs by browser (webm, ogg, mp4),
 * so the recording is decoded and re-encoded as 16 kHz mono WAV — universally accepted and
 * small enough for slow rural connections (~32 KB per second).
 */
const TARGET_RATE = 16_000;

export interface Recorder {
  stop: () => Promise<{ base64: string; mimeType: "audio/wav"; seconds: number }>;
  cancel: () => void;
}

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start();

  const release = () => stream.getTracks().forEach((track) => track.stop());

  return {
    cancel: () => {
      recorder.stop();
      release();
    },
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onstop = async () => {
          release();
          try {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            const ctx = new AudioContext();
            const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
            await ctx.close();
            const mono = await resampleToMono(decoded, TARGET_RATE);
            resolve({ base64: toBase64(encodeWav(mono, TARGET_RATE)), mimeType: "audio/wav", seconds: decoded.duration });
          } catch (err) {
            reject(err);
          }
        };
        recorder.stop();
      }),
  };
}

async function resampleToMono(buffer: AudioBuffer, rate: number): Promise<Float32Array> {
  const offline = new OfflineAudioContext(1, Math.ceil(buffer.duration * rate), rate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  return (await offline.startRendering()).getChannelData(0);
}

export function encodeWav(samples: Float32Array, rate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return buffer;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}
