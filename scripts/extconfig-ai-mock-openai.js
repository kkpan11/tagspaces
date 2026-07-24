window.ExtIsFirstRun = false;
window.ExtCheckForUpdatesOnStartup = false;
window.ExtUseGenerateThumbnails = true;
// A single enabled OpenAI-compatible provider (LM Studio / llama.cpp / vLLM
// shape) pointing at a host the e2e suite intercepts via Playwright route()
// (see armOpenAIMock in tests/e2e/ai.helpers.js). No real service is
// contacted. The renderer talks OpenAI HTTP: GET {url}/models for the model
// list, POST {url}/chat/completions for generation. `url` already carries the
// /v1 base, so the client appends only the endpoint suffix.
// The location is created by the spec via createPwLocation(), so no
// ExtLocations here. The model ids MUST match those armOpenAIMock returns.
window.ExtAI = {
  defaultEngine: 'e2eMockOpenAIEngine',
  engines: [
    {
      id: 'e2eMockOpenAIEngine',
      engine: 'openai-compatible',
      name: 'E2E Mock LM Studio',
      url: 'http://127.0.0.1:1234/v1',
      defaultTextModel: 'mock-text-model',
      defaultImageModel: 'mock-vision-model',
      enable: true,
    },
  ],
};
