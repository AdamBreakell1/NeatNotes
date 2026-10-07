"use strict";
// This fixed import is authored code; students cannot provide an import path.
importScripts('/pseudocode-engine.js?v=rs-h446-2.0.0');
self.onmessage = (event) => {
  const message = event.data;
  if (!message || !['run','check'].includes(message.action) || typeof message.id !== 'string') return;
  const result = message.action === 'run'
    ? self.RecallPseudocode.execute(message.source, message.inputs, { trace: true, files: message.files, seed: message.seed })
    : self.RecallPseudocode.check(message.source, message.cases, message.comparison, { files: message.files });
  self.postMessage({ id: message.id, result });
};
