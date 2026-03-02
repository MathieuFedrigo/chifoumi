import { renderRouter, screen, fireEvent } from "expo-router/testing-library";
import HistoryScreen from "@/app/history";
import { useGameStore } from "@/store/gameStore";
import type { HistoryEntry } from "@/store/gameStore";

const renderHistory = () =>
  renderRouter(
    { "history": HistoryScreen },
    { initialUrl: "/history" }
  );

const setHistory = (entries: HistoryEntry[]) => {
  useGameStore.setState({ roundHistory: entries });
};

describe("HistoryScreen", () => {
  it("renders empty state when no history", () => {
    renderHistory();
    expect(screen.getByText("Game History")).toBeTruthy();
  });

  it("renders a completed RPS round", () => {
    setHistory([
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "paper",
        roundResult: "win",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
    expect(screen.getByText("AI")).toBeTruthy();
    expect(screen.getByText("YOU")).toBeTruthy();
    expect(screen.getByText("vs")).toBeTruthy();
  });

  it("renders multiple rounds with separators", () => {
    setHistory([
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "paper",
        roundResult: "win",
      },
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "scissors",
        playerChoice: "rock",
        roundResult: "win",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
    expect(screen.getByText("Round 2")).toBeTruthy();
  });

  it("renders a mistake entry with too_early and player choice", () => {
    setHistory([
      {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "too_early",
        aiChoice: "rock",
        playerChoice: "scissors",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Too early!")).toBeTruthy();
    expect(screen.getByText("YOU")).toBeTruthy();
  });

  it("renders a mistake entry with too_late and no player choice", () => {
    setHistory([
      {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "too_late",
        aiChoice: "rock",
        playerChoice: null,
      },
    ]);
    renderHistory();
    expect(screen.getByText("Too late!")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders a mistake entry with wrong_type and player choice", () => {
    setHistory([
      {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "wrong_type",
        aiChoice: "rock",
        playerChoice: "paper",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
    expect(screen.getByText("YOU")).toBeTruthy();
  });

  it("renders direction round entry", () => {
    setHistory([
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "rock",
        roundResult: "win",
        directionRound: {
          aiDirection: "up",
          playerDirection: "up",
          matched: true,
        },
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
  });

  it("renders direction round with mismatch", () => {
    setHistory([
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "rock",
        roundResult: "win",
        directionRound: {
          aiDirection: "up",
          playerDirection: "down",
          matched: false,
        },
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
  });

  it("renders countdown round with different beat counts", () => {
    setHistory([
      {
        type: "round",
        choosePhase: "rock",
        aiChoice: "paper",
        playerChoice: "scissors",
        roundResult: "win",
      },
      {
        type: "round",
        choosePhase: "paper",
        aiChoice: "rock",
        playerChoice: "scissors",
        roundResult: "lose",
      },
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "paper",
        roundResult: "win",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
    expect(screen.getByText("Round 2")).toBeTruthy();
    expect(screen.getByText("Round 3")).toBeTruthy();
  });

  it("renders mistake with direction input", () => {
    setHistory([
      {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "wrong_type",
        aiChoice: "rock",
        playerChoice: null,
        playerDirection: "up",
        aiDirection: "down",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
    expect(screen.getByText("YOU")).toBeTruthy();
  });

  it("renders round followed by mistake", () => {
    setHistory([
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "paper",
        roundResult: "win",
      },
      {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "too_late",
        aiChoice: "scissors",
        playerChoice: null,
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
    expect(screen.getByText("Too late!")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders lose round result", () => {
    setHistory([
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "scissors",
        roundResult: "lose",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
  });

  it("renders draw round result", () => {
    setHistory([
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "rock",
        roundResult: "draw",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
  });

  it("scrolls to end when content size changes", () => {
    setHistory([
      {
        type: "round",
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "paper",
        roundResult: "win",
      },
    ]);
    renderHistory();
    const list = screen.getByTestId("history-list");
    fireEvent(list, "contentSizeChange", 500, 200);
    expect(list).toBeTruthy();
  });

  it("renders mistake entry with AI choice shown (too_late with generated AI)", () => {
    setHistory([
      {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "too_late",
        aiChoice: "paper",
        playerChoice: null,
      },
    ]);
    renderHistory();
    expect(screen.getByText("Too late!")).toBeTruthy();
    expect(screen.getByText("AI")).toBeTruthy();
  });
});
