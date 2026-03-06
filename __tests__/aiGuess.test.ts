import {
  computeAiGuess,
  repeatRule,
  rpsOnlyCycleRule,
  dirOnlyCycleRule,
  crossTypeCycleRule,
  afterDirectionRule,
  afterRPSRule,
  mostFrequentRule,
} from "@/lib/aiGuess";
import type { HistoryEntry } from "@/store/gameStore";

const rpsRound = (playerChoice: "rock" | "paper" | "scissors"): HistoryEntry => ({
  type: "round",
  isDirectionRound: false,
  choosePhase: "scissors",
  aiChoice: "rock",
  playerChoice,
  roundResult: "win",
});

const dirRound = (playerDirection: "up" | "down" | "left" | "right"): HistoryEntry => ({
  type: "round",
  isDirectionRound: true,
  choosePhase: "scissors",
  roundResult: "win",
  aiDirection: "up",
  playerDirection,
});

describe("computeAiGuess", () => {
  it("returns null for empty history", () => {
    expect(computeAiGuess({ history: [], forRoundType: "rps" })).toBeNull();
  });

  it("returns first matching rule result", () => {
    const history = [rpsRound("paper"), rpsRound("paper")];
    expect(computeAiGuess({ history, forRoundType: "rps" })).toBe("paper");
  });

  it("returns null when no rule matches", () => {
    const history = [rpsRound("rock"), rpsRound("paper")];
    expect(computeAiGuess({ history, forRoundType: "rps" })).toBeNull();
  });
});

describe("repeatRule", () => {
  describe("rps", () => {
    it("returns null for empty history", () => {
      expect(repeatRule([], "rps")).toBeNull();
    });

    it("returns null for 1 round", () => {
      expect(repeatRule([rpsRound("rock")], "rps")).toBeNull();
    });

    it("returns the choice when last 2 rps rounds have same choice", () => {
      expect(repeatRule([rpsRound("paper"), rpsRound("paper")], "rps")).toBe("paper");
    });

    it("returns null when last 2 rps rounds have different choices", () => {
      expect(repeatRule([rpsRound("rock"), rpsRound("paper")], "rps")).toBeNull();
    });

    it("ignores direction rounds when computing rps guess", () => {
      const history = [rpsRound("scissors"), dirRound("up"), dirRound("up"), rpsRound("scissors")];
      expect(repeatRule(history, "rps")).toBe("scissors");
    });

    it("ignores mistake entries", () => {
      const mistake: HistoryEntry = {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "too_late",
        aiInput: "rock",
        playerInput: null,
      };
      const history = [rpsRound("rock"), mistake, rpsRound("rock")];
      expect(repeatRule(history, "rps")).toBe("rock");
    });
  });

  describe("directions", () => {
    it("returns null for empty history", () => {
      expect(repeatRule([], "directions")).toBeNull();
    });

    it("returns null for 1 direction round", () => {
      expect(repeatRule([dirRound("up")], "directions")).toBeNull();
    });

    it("returns the direction when last 2 direction rounds have same direction", () => {
      expect(repeatRule([dirRound("left"), dirRound("left")], "directions")).toBe("left");
    });

    it("returns null when last 2 direction rounds differ", () => {
      expect(repeatRule([dirRound("up"), dirRound("down")], "directions")).toBeNull();
    });

    it("ignores rps rounds when computing direction guess", () => {
      const history = [dirRound("right"), rpsRound("rock"), rpsRound("rock"), dirRound("right")];
      expect(repeatRule(history, "directions")).toBe("right");
    });
  });
});

describe("rpsOnlyCycleRule", () => {
  it("detects length-2 cycle and returns next", () => {
    // cycle: rock, paper, rock, paper → next (index 4%2=0) is rock
    const history = [
      rpsRound("rock"), rpsRound("paper"),
      rpsRound("rock"), rpsRound("paper"),
    ];
    expect(rpsOnlyCycleRule(history, "rps")).toBe("rock");
  });

  it("detects length-3 cycle and returns next", () => {
    // cycle: rock, paper, scissors × 2 → next (index 6%3=0) is rock
    const history = [
      rpsRound("rock"), rpsRound("paper"), rpsRound("scissors"),
      rpsRound("rock"), rpsRound("paper"), rpsRound("scissors"),
    ];
    expect(rpsOnlyCycleRule(history, "rps")).toBe("rock");
  });

  it("returns null for broken cycle", () => {
    const history = [
      rpsRound("rock"), rpsRound("paper"),
      rpsRound("rock"), rpsRound("scissors"),
    ];
    expect(rpsOnlyCycleRule(history, "rps")).toBeNull();
  });

  it("returns null when not enough reps for any cycle", () => {
    expect(rpsOnlyCycleRule([rpsRound("rock"), rpsRound("paper"), rpsRound("scissors")], "rps")).toBeNull();
  });

  it("ignores direction rounds in history", () => {
    const history = [
      dirRound("up"),
      rpsRound("rock"), rpsRound("paper"),
      rpsRound("rock"), rpsRound("paper"),
    ];
    expect(rpsOnlyCycleRule(history, "rps")).toBe("rock");
  });

  it("returns null for directions type", () => {
    const history = [
      rpsRound("rock"), rpsRound("paper"),
      rpsRound("rock"), rpsRound("paper"),
    ];
    expect(rpsOnlyCycleRule(history, "directions")).toBeNull();
  });
});

describe("dirOnlyCycleRule", () => {
  it("detects length-2 cycle for directions and returns next", () => {
    // cycle: up, down × 2 → next (index 4%2=0) is up
    const history = [
      dirRound("up"), dirRound("down"),
      dirRound("up"), dirRound("down"),
    ];
    expect(dirOnlyCycleRule(history, "directions")).toBe("up");
  });

  it("detects length-3 cycle for directions", () => {
    const history = [
      dirRound("up"), dirRound("left"), dirRound("right"),
      dirRound("up"), dirRound("left"), dirRound("right"),
    ];
    expect(dirOnlyCycleRule(history, "directions")).toBe("up");
  });

  it("returns null for broken cycle", () => {
    const history = [
      dirRound("up"), dirRound("down"),
      dirRound("up"), dirRound("left"),
    ];
    expect(dirOnlyCycleRule(history, "directions")).toBeNull();
  });

  it("returns null when not enough direction rounds", () => {
    expect(dirOnlyCycleRule([dirRound("up"), dirRound("down"), dirRound("up")], "directions")).toBeNull();
  });

  it("ignores rps rounds in history", () => {
    const history = [
      rpsRound("rock"),
      dirRound("up"), dirRound("down"),
      dirRound("up"), dirRound("down"),
    ];
    expect(dirOnlyCycleRule(history, "directions")).toBe("up");
  });

  it("returns null for rps type", () => {
    const history = [
      dirRound("up"), dirRound("down"),
      dirRound("up"), dirRound("down"),
    ];
    expect(dirOnlyCycleRule(history, "rps")).toBeNull();
  });
});

describe("crossTypeCycleRule", () => {
  it("detects mixed cycle and returns rps entry when forRoundType is rps", () => {
    // cycle length 2: [rps(rock), dir(up)] × 2 → next index = 4%2=0 → rps(rock) ✓
    const history = [
      rpsRound("rock"), dirRound("up"),
      rpsRound("rock"), dirRound("up"),
    ];
    expect(crossTypeCycleRule(history, "rps")).toBe("rock");
  });

  it("detects mixed cycle and returns dir entry when forRoundType is directions", () => {
    // cycle length 2: [dir(left), rps(rock)] × 2 → next index = 4%2=0 → dir(left) ✓
    const history = [
      dirRound("left"), rpsRound("rock"),
      dirRound("left"), rpsRound("rock"),
    ];
    expect(crossTypeCycleRule(history, "directions")).toBe("left");
  });

  it("returns null when next in cycle is wrong type", () => {
    // cycle length 2: [rps(rock), dir(up)] × 2 → next index = 4%2=0 → rps(rock), but want directions
    const history = [
      rpsRound("rock"), dirRound("up"),
      rpsRound("rock"), dirRound("up"),
    ];
    expect(crossTypeCycleRule(history, "directions")).toBeNull();
  });

  it("returns null when no cycle found", () => {
    const history = [
      rpsRound("rock"), dirRound("up"),
      rpsRound("paper"), dirRound("down"),
    ];
    expect(crossTypeCycleRule(history, "rps")).toBeNull();
  });

  it("ignores mistake entries in history", () => {
    const mistake: HistoryEntry = {
      type: "mistake",
      choosePhase: "scissors",
      mistakeReason: "too_late",
      aiInput: "rock",
      playerInput: null,
    };
    // cycle of len 2 with a mistake interspersed (ignored)
    const history = [
      rpsRound("rock"), dirRound("up"),
      mistake,
      rpsRound("rock"), dirRound("up"),
    ];
    expect(crossTypeCycleRule(history, "rps")).toBe("rock");
  });
});

describe("afterDirectionRule", () => {
  it("returns null for rps type when fewer than 3 samples", () => {
    // 2 dir→rps transitions
    const history = [dirRound("up"), rpsRound("rock"), dirRound("down"), rpsRound("paper")];
    expect(afterDirectionRule(history, "rps")).toBeNull();
  });

  it("returns dominant choice when ≥ 60% after 3+ samples", () => {
    const history = [
      dirRound("up"), rpsRound("paper"),
      dirRound("down"), rpsRound("paper"),
      dirRound("left"), rpsRound("paper"),
    ];
    expect(afterDirectionRule(history, "rps")).toBe("paper");
  });

  it("returns null when no dominant (< 60%)", () => {
    const history = [
      dirRound("up"), rpsRound("rock"),
      dirRound("down"), rpsRound("paper"),
      dirRound("left"), rpsRound("scissors"),
      dirRound("right"), rpsRound("rock"),
    ];
    expect(afterDirectionRule(history, "rps")).toBeNull();
  });

  it("returns null for directions type", () => {
    const history = [
      dirRound("up"), rpsRound("paper"),
      dirRound("down"), rpsRound("paper"),
      dirRound("left"), rpsRound("paper"),
    ];
    expect(afterDirectionRule(history, "directions")).toBeNull();
  });
});

describe("afterRPSRule", () => {
  it("returns null for directions type when fewer than 3 samples", () => {
    // 2 rps→dir transitions
    const history = [rpsRound("rock"), dirRound("up"), rpsRound("paper"), dirRound("down")];
    expect(afterRPSRule(history, "directions")).toBeNull();
  });

  it("returns dominant direction when ≥ 60% after 3+ samples", () => {
    const history = [
      rpsRound("rock"), dirRound("left"),
      rpsRound("paper"), dirRound("left"),
      rpsRound("scissors"), dirRound("left"),
    ];
    expect(afterRPSRule(history, "directions")).toBe("left");
  });

  it("returns null when no dominant (< 60%)", () => {
    const history = [
      rpsRound("rock"), dirRound("up"),
      rpsRound("paper"), dirRound("down"),
      rpsRound("scissors"), dirRound("left"),
      rpsRound("rock"), dirRound("right"),
    ];
    expect(afterRPSRule(history, "directions")).toBeNull();
  });

  it("returns null for rps type", () => {
    const history = [
      rpsRound("rock"), dirRound("left"),
      rpsRound("paper"), dirRound("left"),
      rpsRound("scissors"), dirRound("left"),
    ];
    expect(afterRPSRule(history, "rps")).toBeNull();
  });
});

describe("mostFrequentRule", () => {
  it("returns null when fewer than 5 rps rounds", () => {
    expect(mostFrequentRule([rpsRound("rock"), rpsRound("rock"), rpsRound("rock"), rpsRound("rock")], "rps")).toBeNull();
  });

  it("returns null when fewer than 5 direction rounds", () => {
    expect(mostFrequentRule([dirRound("up"), dirRound("up"), dirRound("up"), dirRound("up")], "directions")).toBeNull();
  });

  it("fires dominant rps choice when Math.random < 0.7", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    // 4 rock out of 5 = 80%
    const history = [rpsRound("rock"), rpsRound("rock"), rpsRound("rock"), rpsRound("rock"), rpsRound("paper")];
    expect(mostFrequentRule(history, "rps")).toBe("rock");
  });

  it("returns null when Math.random >= 0.7", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.8);
    const history = [rpsRound("rock"), rpsRound("rock"), rpsRound("rock"), rpsRound("rock"), rpsRound("paper")];
    expect(mostFrequentRule(history, "rps")).toBeNull();
  });

  it("returns null when dominant rps < 60%", () => {
    // rock: 3/6 = 50% — clear top but under threshold
    const history = [
      rpsRound("rock"), rpsRound("rock"), rpsRound("rock"),
      rpsRound("paper"), rpsRound("paper"), rpsRound("scissors"),
    ];
    expect(mostFrequentRule(history, "rps")).toBeNull();
  });

  it("returns null on tie in rps", () => {
    const history = [
      rpsRound("rock"), rpsRound("rock"), rpsRound("rock"),
      rpsRound("paper"), rpsRound("paper"), rpsRound("paper"),
    ];
    expect(mostFrequentRule(history, "rps")).toBeNull();
  });

  it("ignores non-rps entries when counting rps choices", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    // 4 rock rps + 1 paper rps + direction rounds (ignored) = rock dominant at 80%
    const history = [
      dirRound("up"),
      rpsRound("rock"), rpsRound("rock"), rpsRound("rock"), rpsRound("rock"), rpsRound("paper"),
    ];
    expect(mostFrequentRule(history, "rps")).toBe("rock");
  });

  it("fires dominant direction when Math.random < 0.7", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    const history = [dirRound("up"), dirRound("up"), dirRound("up"), dirRound("up"), dirRound("down")];
    expect(mostFrequentRule(history, "directions")).toBe("up");
  });

  it("returns null when dominant direction Math.random >= 0.7", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9);
    const history = [dirRound("up"), dirRound("up"), dirRound("up"), dirRound("up"), dirRound("down")];
    expect(mostFrequentRule(history, "directions")).toBeNull();
  });

  it("returns null when dominant direction < 60%", () => {
    // up: 3/6 = 50% — clear top but under threshold
    const history = [
      dirRound("up"), dirRound("up"), dirRound("up"),
      dirRound("down"), dirRound("down"), dirRound("left"),
    ];
    expect(mostFrequentRule(history, "directions")).toBeNull();
  });

  it("returns null on tie in directions", () => {
    const history = [
      dirRound("up"), dirRound("up"), dirRound("up"),
      dirRound("down"), dirRound("down"), dirRound("down"),
    ];
    expect(mostFrequentRule(history, "directions")).toBeNull();
  });

  it("ignores non-direction entries when counting directions", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    // 4 up dirs + 1 down dir + rps rounds (ignored) = up dominant at 80%
    const history = [
      rpsRound("rock"),
      dirRound("up"), dirRound("up"), dirRound("up"), dirRound("up"), dirRound("down"),
    ];
    expect(mostFrequentRule(history, "directions")).toBe("up");
  });
});
