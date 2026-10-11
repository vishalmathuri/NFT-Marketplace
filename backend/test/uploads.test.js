const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { Wallet } = require("ethers");
const sharp = require("sharp");
const { createApp } = require("../server");
const hash = "Qm" + "a".repeat(44);
let server, base, token, png, calls = 0, fail = false, clock = Date.now();
const wallet = Wallet.createRandom();
const env = { PINATA_API_KEY: "test", PINATA_SECRET_API_KEY: "test", FRONTEND_ORIGINS: "https://allowed.example" };
async function post(path, body, options = {}) {
  const response = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", ...(options.auth === false ? {} : { Authorization: `Bearer ${token}` }), ...options.headers }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
async function authorize() {
  const challenge = await post("/auth/challenge", { address: wallet.address }, { auth: false });
  const signature = await wallet.signMessage(challenge.body.message);
  const verified = await post("/auth/verify", { nonce: challenge.body.nonce, signature }, { auth: false });
  token = verified.body.token;
  return { challenge, signature };
}
before(async () => {
  const app = createApp({ env, now: () => clock, pinata: { post: async () => { calls++; if (fail) throw new Error("Private upstream details"); return { data: { IpfsHash: hash } }; } } });
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  png = "data:image/png;base64," + (await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer()).toString("base64");
  await authorize();
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
test("rejects unauthenticated uploads before Pinata", async () => {
  const before = calls;
  assert.equal((await post("/upload-image", { imageBase64: png }, { auth: false })).status, 401);
  assert.equal(calls, before);
});
test("rejects unknown origins", async () => {
  assert.equal((await post("/upload-image", { imageBase64: png }, { headers: { Origin: "https://evil.example" } })).status, 403);
});
test("requires valid signatures and prevents challenge replay", async () => {
  const { challenge, signature } = await authorize();
  assert.equal((await post("/auth/verify", { nonce: challenge.body.nonce, signature }, { auth: false })).status, 401);
  const next = await post("/auth/challenge", { address: wallet.address }, { auth: false });
  const wrong = await Wallet.createRandom().signMessage(next.body.message);
  assert.equal((await post("/auth/verify", { nonce: next.body.nonce, signature: wrong }, { auth: false })).status, 401);
});
test("rejects malformed base64, SVG and disguised non-images", async () => {
  const before = calls;
  for (const imageBase64 of ["data:image/png;base64,!!!!", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", "data:image/png;base64," + Buffer.from("not a png").toString("base64"), png.replace("image/png", "image/jpeg")]) {
    assert.equal((await post("/upload-image", { imageBase64 })).status, 400);
  }
  assert.equal(calls, before);
});
test("rejects oversized decoded images", async () => {
  const data = "data:image/png;base64," + Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64");
  assert.equal((await post("/upload-image", { imageBase64: data })).status, 413);
});
test("decodes and pins a valid image", async () => {
  const result = await post("/upload-image", { imageBase64: png });
  assert.equal(result.status, 200);
  assert.equal(result.body.imageURL, `https://gateway.pinata.cloud/ipfs/${hash}`);
});
test("validates metadata types, lengths and IPFS image URLs", async () => {
  for (const body of [{ name: {}, description: "x", image: "x" }, { name: "n".repeat(101), description: "x", image: "x" }, { name: "ok", description: "d", image: "https://evil.example/a.png" }]) assert.equal((await post("/upload-metadata", body)).status, 400);
  assert.equal((await post("/upload-metadata", { name: "Test", description: "Description", image: `https://gateway.pinata.cloud/ipfs/${hash}` })).status, 200);
});
test("does not expose upstream details on failure", async () => {
  fail = true;
  const result = await post("/upload-image", { imageBase64: png });
  assert.equal(result.status, 502);
  assert.ok(!JSON.stringify(result.body).includes("Private upstream"));
  fail = false;
});
test("limits uploads by wallet, including invalid requests", async () => {
  let result;
  for (let i = 0; i < 10; i++) result = await post("/upload-metadata", {});
  assert.equal(result.status, 429);
});
test("expires upload sessions", async () => {
  clock += 16 * 60 * 1000;
  assert.equal((await post("/upload-image", { imageBase64: png })).status, 401);
});
