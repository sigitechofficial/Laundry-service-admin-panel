const ENV_MODEL = import.meta.env.LAUNDRY_GEMINI_MODEL || null;
let cachedModelName = ENV_MODEL;

async function getModelForGenerateContent(apiKey) {
  if (cachedModelName) return cachedModelName;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) {
    let err = {};
    try {
      err = await res.json();
    } catch (_e) {
      // ignore JSON parse error
    }
    throw new Error(err?.error?.message || "Failed to list models");
  }
  const data = await res.json();
  const models = data?.models || [];
  const supportsGenerate = (m) => {
    const methods = m.supportedGenerationMethods || m.supported_actions || [];
    return methods.some(
      (s) => s && s.toLowerCase().replace(/_/g, "") === "generatecontent"
    );
  };
  const supported = models.find(supportsGenerate);
  if (!supported?.name) {
    throw new Error(
      "No model with generateContent found. Check your API key at https://aistudio.google.com/apikey"
    );
  }
  cachedModelName = supported.name.replace(/^models\//, "");
  return cachedModelName;
}

export async function generateWithGemini(prompt, apiKey) {
  const model = await getModelForGenerateContent(apiKey);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    }),
  });
  if (!res.ok) {
    let err = {};
    try {
      err = await res.json();
    } catch (_e) {
      // ignore JSON parse error
    }
    throw new Error(err?.error?.message || res.statusText || "API request failed");
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text in response");
  return text.trim();
}
