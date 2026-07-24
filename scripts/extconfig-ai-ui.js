window.ExtIsFirstRun = false;
window.ExtCheckForUpdatesOnStartup = false;
window.ExtUseGenerateThumbnails = true;
// Intentionally NO window.ExtAI: with ExtAI defined the Settings → AI provider
// editing UI is disabled (externalConfig), which would block adding a provider.
// Leaving it undefined makes getDefaultAIProvider() read redux (empty on a
// freshly-cleared store), so the add-engine menu and preset flow are enabled
// and deterministic. The location is created by the spec via createPwLocation().
