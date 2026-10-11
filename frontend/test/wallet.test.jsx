import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";
import * as contract from "../src/utils/contract";
import { loadListings } from "../src/utils/listings";
vi.mock("../src/utils/contract", () => ({ SEPOLIA_ID: "0xaa36a7", getContracts: vi.fn(), getReadContracts: vi.fn(), switchToSepolia: vi.fn(), errorMessage: error => error.code === 4001 ? "Wallet request declined. You can try again." : error.message }));
vi.mock("../src/utils/listings", () => ({ loadListings: vi.fn() }));
vi.mock("../src/components/CreateNFT", () => ({ default: () => <div>Mint form</div> }));
const seller = "0x1111111111111111111111111111111111111111";
const buyer = "0x2222222222222222222222222222222222222222";
let accounts, chain, request, listeners, market;
function emit(name, data) { listeners.get(name)?.forEach(fn => fn(data)); }
beforeEach(() => {
  vi.clearAllMocks(); accounts = []; chain = "0xaa36a7"; listeners = new Map();
  request = vi.fn(async ({ method }) => {
    if (method === "eth_accounts") return accounts;
    if (method === "eth_chainId") return chain;
    if (method === "eth_requestAccounts") { accounts = [buyer]; return accounts; }
  });
  window.ethereum = { request, on: (name, fn) => { listeners.set(name, [...(listeners.get(name) || []), fn]); }, removeListener: (name, fn) => listeners.set(name, (listeners.get(name) || []).filter(x => x !== fn)) };
  market = { proceeds: vi.fn(async () => 0n), buyNFT: vi.fn(), cancelListing: vi.fn(), withdrawProceeds: vi.fn() };
  contract.getContracts.mockImplementation(async () => ({ marketplace: market, nft: {}, signer: {} }));
  contract.getReadContracts.mockReturnValue({ marketplace: {}, provider: { destroy: vi.fn() } });
  loadListings.mockResolvedValue({ items: [{ itemId: "1", nft: seller, tokenId: "1", seller, price: "100", name: "Visible NFT", description: "Test", image: null }], next: null });
});
afterEach(() => { cleanup(); delete window.ethereum; });
describe("wallet and transaction workflows", () => {
  it("browses without a wallet and never requests access on page load", async () => {
    delete window.ethereum; render(<App />); await screen.findByText("Visible NFT");
    expect(screen.getByRole("button", { name: "Buy" }).disabled).toBe(true); expect(request).not.toHaveBeenCalled();
  });
  it("silently checks authorization without wallet prompts", async () => {
    render(<App />); await screen.findByText("Visible NFT");
    expect(request.mock.calls.some(([input]) => input.method === "eth_requestAccounts")).toBe(false);
  });
  it("switches a connected wallet to Sepolia", async () => {
    accounts = [buyer]; chain = "0x1";
    contract.switchToSepolia.mockImplementation(async () => { chain = "0xaa36a7"; });
    render(<App />); fireEvent.click(await screen.findByRole("button", { name: "Switch to Sepolia" }));
    await screen.findByText("Mint form"); expect(contract.switchToSepolia).toHaveBeenCalledOnce();
  });
  it("clears wallet and removes listeners on disconnect/unmount", async () => {
    accounts = [buyer]; const view = render(<App />); await screen.findByText("Mint form");
    act(() => emit("disconnect")); await screen.findByRole("button", { name: "Connect Wallet" });
    expect(screen.queryByText("Mint form")).toBeNull(); view.unmount(); expect([...listeners.values()].flat()).toHaveLength(0);
  });
  it("updates seller actions after an account change", async () => {
    accounts = [buyer]; render(<App />); await screen.findByText("Mint form"); await screen.findByText("Visible NFT");
    expect(screen.getByRole("button", { name: "Buy" }).disabled).toBe(false);
    accounts = [seller]; act(() => emit("accountsChanged", accounts)); await screen.findByRole("button", { name: "Cancel listing" });
  });
  it("shows pending/confirmed states and prevents duplicate purchases", async () => {
    accounts = [buyer]; let confirm;
    market.buyNFT.mockResolvedValue({ hash: "0x123", wait: () => new Promise(resolve => { confirm = resolve; }) });
    render(<App />); await screen.findByText("Mint form"); await screen.findByText("Visible NFT");
    fireEvent.click(screen.getByRole("button", { name: "Buy" })); await screen.findByText(/Buy NFT: waiting for confirmation/);
    expect(screen.getByRole("button", { name: "Buy" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Buy" })); expect(market.buyNFT).toHaveBeenCalledOnce();
    await act(async () => confirm({ status: 1 })); await screen.findByText("Purchase confirmed.");
    expect(screen.getByRole("link", { name: "View transaction" }).getAttribute("href")).toContain("0x123");
  });
  it("shows rejection and unlocks the UI", async () => {
    accounts = [buyer]; market.buyNFT.mockRejectedValue(Object.assign(new Error("denied"), { code: 4001 }));
    render(<App />); await screen.findByText("Mint form"); await screen.findByText("Visible NFT");
    fireEvent.click(screen.getByRole("button", { name: "Buy" })); await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toContain("Wallet request declined");
    await waitFor(() => expect(screen.getByRole("button", { name: "Buy" }).disabled).toBe(false));
  });
  it("removes transaction access after a chain change", async () => {
    accounts = [buyer]; render(<App />); await screen.findByText("Mint form"); await screen.findByText("Visible NFT");
    chain = "0x1"; act(() => emit("chainChanged", chain)); await screen.findByRole("button", { name: "Switch to Sepolia" });
    expect(screen.getByRole("button", { name: "Buy" }).disabled).toBe(true);
  });
});
