import { describe, expect, it } from "vitest";
import { formatDuration, formatNumber, formatPercent, formatVariation } from "./format";

describe("formatação pt-BR", () => {
  it("não fabrica zero para métricas ausentes", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatDuration(null)).toBe("—");
    expect(formatPercent(null)).toBe("—");
    expect(formatVariation(null)).toBe("—");
  });

  it("formata números, duração, percentuais e variação", () => {
    expect(formatNumber(1234.5)).toBe("1.234,5");
    expect(formatDuration(18.5)).toBe("18,5 ms");
    expect(formatPercent(98.25)).toBe("98,25%");
    expect(formatVariation(4.5)).toBe("+4,5%");
  });
});
