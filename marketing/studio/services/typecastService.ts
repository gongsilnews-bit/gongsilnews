
export const generateTypecastAudio = async (
  text: string,
  apiKey: string,
  actorId: string,
  emotion?: string
): Promise<string> => {
  if (!apiKey || !actorId) {
    throw new Error("Typecast API Key and Actor ID are required.");
  }

  // NOTE: This assumes Typecast's standard API structure. 
  // Since APIs can change, ensure the endpoint matches the current Typecast API documentation.
  const response = await fetch(
    `https://typecast.ai/api/speak`, 
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text: text,
        lang: "auto",
        actor_id: actorId,
        x_api_id: "typecast-api", // Sometimes required depending on specific Typecast plan
        emotion_tone_preset: emotion || "normal-1"
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Typecast API Error: ${response.status} ${
        errorData.detail?.message || errorData.message || response.statusText
      }`
    );
  }

  // Typecast usually returns the audio file directly or a JSON with a URL.
  // Assuming direct blob return for this implementation pattern. 
  // If Typecast returns JSON { result: url }, this needs adjustment:
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
      const json = await response.json();
      if (json.audio_url) {
          const audioRes = await fetch(json.audio_url);
          const blob = await audioRes.blob();
          return URL.createObjectURL(blob);
      }
      if (json.result && typeof json.result === 'string' && json.result.startsWith('http')) {
           const audioRes = await fetch(json.result);
           const blob = await audioRes.blob();
           return URL.createObjectURL(blob);
      }
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
