import { describe, expect, it } from "vitest";
import { createFilterState, dateRangeError, datesForPreset, toApiFilters, toBrowserSearchParams } from "./date-range";

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
    const state = createFilterState(new URLSearchParams("period=custom&from=2026-08-02&to=2026-08-08&persona=ALUNO&toolName=Notas&institution=UEG&aiProvider=external"), now);
    expect(toApiFilters(state)).toEqual({
      from: "2026-08-02T00:00:00",
      to: "2026-08-08T23:59:59.999",
      persona: "ALUNO",
      toolName: "Notas",
      institution: "UEG",
      aiProvider: "external",
    });
    expect(toBrowserSearchParams(state).get("toolName")).toBe("Notas");
    expect(toBrowserSearchParams(state).get("aiProvider")).toBe("external");
    expect(toApiFilters(state).aiProvider).toBe("external");
  });

  it("aceita um único dia e valida calendário, campos obrigatórios e ordem", () => {
    expect(dateRangeError("2026-08-12", "2026-08-12")).toBe("");
    expect(dateRangeError("2024-02-29", "2024-03-01")).toBe("");
    expect(dateRangeError("2026-02-29", "2026-03-01")).toContain("válidas");
    expect(dateRangeError("", "2026-03-01")).toContain("válidas");
    expect(dateRangeError("2026-08-20", "2026-08-12")).toContain("posterior");
  });

  it("não substitui datas inválidas da URL por um período diferente nem as envia à API", () => {
    const state = createFilterState(new URLSearchParams("period=custom&from=2026-08-20&to=2026-08-12"), now);
    expect(state.toDate).toBe("2026-08-12");
    expect(() => toApiFilters(state)).toThrow("posterior");
    const invalid = createFilterState(new URLSearchParams("period=custom&from=2026-02-30&to="), now);
    expect(invalid.fromDate).toBe("2026-02-30");
    expect(() => toApiFilters(invalid)).toThrow("válidas");
  });

  it("consulta os mesmos limites em sete dias e em um intervalo personalizado idêntico", () => {
    const instant = new Date("2026-10-14T18:00:00Z");
    const preset = createFilterState(new URLSearchParams("period=7&aiProvider=external"), instant);
    const custom = createFilterState(new URLSearchParams("period=custom&from=2026-10-08&to=2026-10-14&aiProvider=external"), instant);
    expect(toApiFilters(preset)).toEqual(toApiFilters(custom));
  });

  it("recalcula presets com datas antigas ou invertidas na URL usando o dia em São Paulo", () => {
    const state = createFilterState(new URLSearchParams("period=7&from=2026-10-15&to=2026-10-14"), new Date("2026-10-15T01:00:00Z"));
    expect(state).toMatchObject({ fromDate: "2026-10-08", toDate: "2026-10-14" });
    expect(dateRangeError(state.fromDate, state.toDate)).toBe("");
  });

  it("inicializa o outro limite sem inverter datas quando um link personalizado tem só um limite", () => {
    const onlyFrom = createFilterState(new URLSearchParams("period=custom&from=2026-09-01"), now);
    expect(onlyFrom.toDate).toBe("2026-09-01");
    const onlyTo = createFilterState(new URLSearchParams("period=custom&to=2026-07-01"), now);
    expect(onlyTo.fromDate).toBe("2026-07-01");
  });
});
