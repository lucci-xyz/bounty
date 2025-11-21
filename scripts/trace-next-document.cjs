const Module = require('module');
const path = require('path');

const originalLoad = Module._load;

Module._load = function (request, parent, isMain) {
  if (typeof request === 'string' && request.includes('_document')) {
    const parentFile = parent && parent.filename ? parent.filename : 'unknown';
    console.warn(
      `[trace-next-document] Imported "${request}" from ${parentFile}\n` +
      new Error().stack
    );
  }

  return originalLoad.apply(this, arguments);
};

