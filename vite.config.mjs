// Headers also protect worker responses. Retain them if serving with another host.
const policy="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
export default {
  server:{headers:{'Content-Security-Policy':policy.replace("connect-src 'self'","connect-src 'self' ws://127.0.0.1:* ws://localhost:*")}},
  preview:{headers:{'Content-Security-Policy':policy}},
};
