export type SoundType =
  | "success"
  | "payment-success"
  | "error"
  | "notification";

const SOUND_VOLUME = 0.18;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    if (!audioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) return null;
      audioContext = new AudioContextClass();
    }

    return audioContext;
  } catch {
    return null;
  }
}

async function resumeAudioContext(): Promise<AudioContext | null> {
  const context = getAudioContext();
  if (!context) return null;

  try {
    if (context.state === "suspended") {
      await context.resume();
    }
    return context;
  } catch {
    return null;
  }
}

function playTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  startDelay = 0,
  type: OscillatorType = "sine",
): void {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startTime = context.currentTime + startDelay;
  const endTime = startTime + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(SOUND_VOLUME, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
}

export async function playSound(sound: SoundType): Promise<void> {
  const context = await resumeAudioContext();
  if (!context) return;

  switch (sound) {
    case "success":
      playTone(context, 660, 0.12);
      playTone(context, 880, 0.16, 0.1);
      break;

    case "payment-success":
      playTone(context, 523.25, 0.12);
      playTone(context, 659.25, 0.12, 0.1);
      playTone(context, 783.99, 0.2, 0.2);
      break;

    case "error":
      playTone(context, 330, 0.16, 0, "triangle");
      playTone(context, 220, 0.2, 0.16, "triangle");
      break;

    case "notification":
      playTone(context, 740, 0.1);
      playTone(context, 740, 0.12, 0.12);
      break;
  }
}

function getHindiFemaleVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return undefined;
  }

  const voices = window.speechSynthesis.getVoices();

  const hindiVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("hi"),
  );

  return (
    hindiVoices.find((voice) => {
      const name = voice.name.toLowerCase();
      return (
        name.includes("female") ||
        name.includes("swara") ||
        name.includes("neerja")
      );
    }) ?? hindiVoices[0]
  );
}

export function speak(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
  },
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    const speakNow = () => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getHindiFemaleVoice();

        utterance.lang = voice?.lang ?? "hi-IN";
        if (voice) utterance.voice = voice;

        utterance.rate = options?.rate ?? 0.9;
        utterance.pitch = options?.pitch ?? 1.05;
        utterance.volume = options?.volume ?? 0.9;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        // Voice is optional.
      }
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      speakNow();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", speakNow, {
        once: true,
      });
    }
  } catch {
    // Voice errors must not interrupt CRM workflows.
  }
}

export async function playPaymentSuccess(): Promise<void> {
  await playSound("payment-success");
}

export function stopVoice(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore cancellation errors.
  }
}
