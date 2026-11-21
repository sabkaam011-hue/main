import { describe, expect, it } from "vitest";
import { buildIndex, editDistance, normalize, search } from "@/lib/search/engine";
import { SEED_SERVICES } from "@/lib/catalogue/services";
import { CATEGORIES } from "@/lib/catalogue/categories";

const index = buildIndex(SEED_SERVICES, CATEGORIES);
const slugs = (q: string, n = 10) => search(index, q, { limit: n }).results.map((r) => r.service.slug);

describe("search engine", () => {
  it("PAN returns the five PAN services first", () => {
    const top = slugs("PAN", 5);
    expect(new Set(top)).toEqual(
      new Set(["apply-pan-card", "pan-card-correction", "pan-card-status", "pan-card-documents", "pan-card-application-assistance"]),
    );
  });

  it("loan returns the five loan services first", () => {
    const top = slugs("loan", 5);
    expect(new Set(top)).toEqual(
      new Set(["pm-mudra-yojana", "pmegp-loan", "education-loan-guidance", "agriculture-loan-schemes", "business-loan-assistance"]),
    );
  });

  it("handles Hindi queries", () => {
    expect(slugs("पैन कार्ड")[0]).toMatch(/pan/);
    expect(slugs("छात्रवृत्ति")).toContain("national-scholarship-portal");
    expect(slugs("किसान")).toContain("pm-kisan");
    expect(slugs("आवास योजना")[0]).toMatch(/awas|pmay/);
  });

  it("handles Hinglish and synonyms", () => {
    expect(slugs("sarkari naukri")).toContain("government-job-listings");
    expect(slugs("ghar yojana")).toContain("pm-awas-yojana");
    expect(slugs("karz")).toContain("pm-mudra-yojana");
  });

  it("tolerates spelling mistakes", () => {
    expect(slugs("scolarship")).toContain("national-scholarship-portal");
    expect(slugs("adhaar")[0]).toBe("aadhaar-update");
    expect(slugs("pasport")[0]).toBe("passport-guidance");
    expect(slugs("ayushmaan")[0]).toBe("ayushman-bharat-pmjay");
    expect(slugs("udyog aadhar")).toContain("udyam-registration");
  });

  it("supports prefix matching while typing", () => {
    expect(slugs("schol")).toContain("national-scholarship-portal");
    expect(slugs("ayush")[0]).toBe("ayushman-bharat-pmjay");
  });

  it("matches aliases not in titles", () => {
    expect(slugs("cibil")[0]).toMatch(/credit/);
    expect(slugs("gas cylinder")[0]).toBe("pm-ujjwala-yojana");
    expect(slugs("hall ticket")[0]).toBe("admit-card-download");
  });

  it("gives a no-results state with related services and suggestions", () => {
    const r = search(index, "xyzqq");
    expect(r.results).toHaveLength(0);
    expect(r.related.length).toBeGreaterThan(0);
  });

  it("normalises Devanagari nukta and punctuation", () => {
    expect(normalize("दस्तावेज़!")).toBe(normalize("दस्तावेज"));
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("ab", "ba")).toBe(1);
  });
});
