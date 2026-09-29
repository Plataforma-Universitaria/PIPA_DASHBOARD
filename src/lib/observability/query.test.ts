import { describe, expect, it } from "vitest";
import { pickObservabilityFilters, toObservabilitySearchParams } from "./query";

describe("observability query", () => {
  it("encaminha somente os filtros públicos permitidos", () => {
    const source = new URLSearchParams({
      from: "2026-08-01T00:00:00",
      persona: " Aluno ",
      institution: "UEG",
      sessionId: "privado",
      userSessionId: "42",
      format: "pdf",
    });

    expect(pickObservabilityFilters(source).toString()).toBe(
      "from=2026-08-01T00%3A00%3A00&persona=Aluno&institution=UEG",
    );
  });

  it("omite filtros vazios ao montar a consulta", () => {
    const params = toObservabilitySearchParams({
      from: "2026-08-01T00:00:00",
      to: "2026-08-30T23:59:59.999",
      persona: "",
      toolName: " ",
      institution: "UEG",
    });

    expect(Object.fromEntries(params)).toEqual({
      from: "2026-08-01T00:00:00",
      to: "2026-08-30T23:59:59.999",
      institution: "UEG",
    });
  });
});
