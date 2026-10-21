import { describe, expect, it } from "vitest";
import { pdfHeaders } from "@/lib/pdf-response";

const request = new Request("https://example.com/file?download=1");

describe("pdfHeaders", () => {
  it("handles non-ASCII file names without throwing", () => {
    const headers = pdfHeaders(request, "Resume – 简历 (1).pdf");
    expect(() => new Headers(headers)).not.toThrow();
    expect(headers["Content-Disposition"]).toContain("attachment;");
    expect(headers["Content-Disposition"]).toContain(
      "filename*=UTF-8''Resume%20%E2%80%93%20%E7%AE%80%E5%8E%86%20%281%29.pdf"
    );
  });

  it("strips quotes from the ASCII fallback", () => {
    const headers = pdfHeaders(new Request("https://example.com/"), 'a"b.pdf');
    expect(headers["Content-Disposition"]).toMatch(/^inline; filename="ab\.pdf"/);
  });
});
