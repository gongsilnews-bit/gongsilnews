
export const generateElevenLabsAudio = async (
  text: string,
  apiKey: string,
  voiceId: string
): Promise<string> => {
  if (!apiKey || !voiceId) {
    throw new Error("ElevenLabs API Key and Voice ID are required.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `ElevenLabs API Error: ${response.status} ${
        errorData.detail?.message || response.statusText
      }`
    );
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
