import { describe, expect, it } from "vitest";
import { createFilterState, datesForPreset, toApiFilters, toBrowserSearchParams } from "./date-range";

describe("período e filtros do dashboard", () => {
  const now = new Date("2026-08-30T15:00:00Z");

  it("inicia nos últimos 30 dias do calendário de São Paulo", () => {
    expect(createFilterState(new URLSearchParams(), now)).toMatchObject({
      period: "30",
      fromDate: "2026-08-01",
      toDate: "2026-08-30",
      persona: "",
      institution: "",
    });
    expect(datesForPreset("7", now)).toEqual({ fromDate: "2026-08-24", toDate: "2026-08-30" });
  });

  it("preserva filtros na URL e converte datas para os limites do dia", () => {
    const state = createFilterState(new URLSearchParams("period=custom&from=2026-08-02&to=2026-08-08&persona=ALUNO&toolName=Notas&institution=UEG"), now);
    expect(toApiFilters(state)).toEqual({
      from: "2026-08-02T00:00:00",
      to: "2026-08-08T23:59:59.999",
      persona: "ALUNO",
      toolName: "Notas",
      institution: "UEG",
    });
    expect(toBrowserSearchParams(state).get("toolName")).toBe("Notas");
  });
});
