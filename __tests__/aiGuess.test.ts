import { computeAiGuess } from "@/lib/aiGuess";
import type { HistoryEntry } from "@/store/gameStore";

const rpsRound = (playerChoice: "rock" | "paper" | "scissors"): HistoryEntry => ({
  type: "round",
  choosePhase: "scissors",
  aiChoice: "rock",
  playerChoice,
  roundResult: "win",
});

const dirRound = (playerDirection: "up" | "down" | "left" | "right"): HistoryEntry => ({
  type: "round",
  choosePhase: "scissors",
  aiChoice: "rock",
  playerChoice: "rock",
  roundResult: "win",
  directionRound: {
    aiDirection: "up",
    playerDirection,
    matched: playerDirection === "up",
  },
});

describe("computeAiGuess", () => {
  describe("rps", () => {
    it("returns null for empty history", () => {
      expect(computeAiGuess({ history: [], forRoundType: "rps" })).toBeNull();
    });

    it("returns null for 1 round", () => {
      expect(computeAiGuess({ history: [rpsRound("rock")], forRoundType: "rps" })).toBeNull();
    });

    it("returns the choice when last 2 rps rounds have same choice", () => {
      const history = [rpsRound("paper"), rpsRound("paper")];
      expect(computeAiGuess({ history, forRoundType: "rps" })).toBe("paper");
    });

    it("returns null when last 2 rps rounds have different choices", () => {
      const history = [rpsRound("rock"), rpsRound("paper")];
      expect(computeAiGuess({ history, forRoundType: "rps" })).toBeNull();
    });

    it("ignores direction rounds when computing rps guess", () => {
      const history = [rpsRound("scissors"), dirRound("up"), dirRound("up"), rpsRound("scissors")];
      expect(computeAiGuess({ history, forRoundType: "rps" })).toBe("scissors");
    });

    it("ignores mistake entries", () => {
      const mistake: HistoryEntry = {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "too_late",
        aiChoice: "rock",
        playerChoice: null,
      };
      const history = [rpsRound("rock"), mistake, rpsRound("rock")];
      expect(computeAiGuess({ history, forRoundType: "rps" })).toBe("rock");
    });
  });

  describe("directions", () => {
    it("returns null for empty history", () => {
      expect(computeAiGuess({ history: [], forRoundType: "directions" })).toBeNull();
    });

    it("returns null for 1 direction round", () => {
      expect(computeAiGuess({ history: [dirRound("up")], forRoundType: "directions" })).toBeNull();
    });

    it("returns the direction when last 2 direction rounds have same direction", () => {
      const history = [dirRound("left"), dirRound("left")];
      expect(computeAiGuess({ history, forRoundType: "directions" })).toBe("left");
    });

    it("returns null when last 2 direction rounds differ", () => {
      const history = [dirRound("up"), dirRound("down")];
      expect(computeAiGuess({ history, forRoundType: "directions" })).toBeNull();
    });

    it("ignores rps rounds when computing direction guess", () => {
      const history = [dirRound("right"), rpsRound("rock"), rpsRound("rock"), dirRound("right")];
      expect(computeAiGuess({ history, forRoundType: "directions" })).toBe("right");
    });
  });
});
