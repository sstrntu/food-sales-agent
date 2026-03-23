const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "YOUR_ELEVENLABS_API_KEY";
const ELEVENLABS_VOICE = import.meta.env.VITE_ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // "Adam"

let currentAudio = null;

export async function speak(text) {
  if (!isVoiceConfigured()) return null;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
      }),
    });

    if (!res.ok) {
      console.error("ElevenLabs error:", res.status);
      return null;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
    };

    return audio;
  } catch (err) {
    console.error("TTS error:", err);
    return null;
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function isVoiceConfigured() {
  return ELEVENLABS_KEY !== "YOUR_ELEVENLABS_API_KEY" && ELEVENLABS_KEY.length > 0;
}
