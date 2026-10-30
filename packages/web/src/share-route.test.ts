import { describe, expect, it } from "vitest";
import { parseShareHref } from "./api";

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

describe("parseShareHref", () => {
  it("reads /s/<token> at the host root and under the Pages base", () => {
    expect(parseShareHref(`/s/${TOKEN}`, "")).toEqual({ kind: "token", token: TOKEN });
    expect(parseShareHref(`/porutham/s/${TOKEN}`, "/porutham")).toEqual({ kind: "token", token: TOKEN });
    expect(parseShareHref(`/porutham/s/${TOKEN}/`, "/porutham")).toEqual({ kind: "token", token: TOKEN });
  });

  it("reads a share query on the index and on /result", () => {
    expect(parseShareHref(`/?share=${TOKEN}`, "")).toEqual({ kind: "token", token: TOKEN });
    expect(parseShareHref(`/porutham/?share=${TOKEN}`, "/porutham")).toEqual({ kind: "token", token: TOKEN });
    expect(parseShareHref(`/result?share=${TOKEN}&lang=ta`, "")).toEqual({ kind: "token", token: TOKEN });
    expect(parseShareHref(`/porutham/result?tradition=tamil-nadu&share=${TOKEN}`, "/porutham")).toEqual({ kind: "token", token: TOKEN });
  });

  it("leaves ordinary result links alone and rejects a short token", () => {
    expect(parseShareHref("/result?tradition=tamil-nadu&bNak=rohini", "")).toBeNull();
    expect(parseShareHref("/porutham/result?tradition=tamil-nadu", "/porutham")).toBeNull();
    expect(parseShareHref("/s/too-short", "")).toEqual({ kind: "invalid" });
    expect(parseShareHref("/?share=nope", "")).toEqual({ kind: "invalid" });
  });
});
