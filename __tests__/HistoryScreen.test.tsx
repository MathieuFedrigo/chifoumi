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
        isDirectionRound: false,
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
        isDirectionRound: false,
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "paper",
        roundResult: "win",
      },
      {
        type: "round",
        isDirectionRound: false,
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
        aiInput: "rock",
        playerInput: "scissors",
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
        aiInput: "rock",
        playerInput: null,
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
        aiInput: "rock",
        playerInput: "paper",
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
        isDirectionRound: true,
        choosePhase: "scissors",
        roundResult: "win",
        aiDirection: "up",
        playerDirection: "up",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
  });

  it("renders direction round with mismatch", () => {
    setHistory([
      {
        type: "round",
        isDirectionRound: true,
        choosePhase: "scissors",
        roundResult: "win",
        aiDirection: "up",
        playerDirection: "down",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Round 1")).toBeTruthy();
  });

  it("renders countdown round with different beat counts", () => {
    setHistory([
      {
        type: "round",
        isDirectionRound: false,
        choosePhase: "rock",
        aiChoice: "paper",
        playerChoice: "scissors",
        roundResult: "win",
      },
      {
        type: "round",
        isDirectionRound: false,
        choosePhase: "paper",
        aiChoice: "rock",
        playerChoice: "scissors",
        roundResult: "lose",
      },
      {
        type: "round",
        isDirectionRound: false,
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
        aiInput: "down",
        playerInput: "up",
      },
    ]);
    renderHistory();
    expect(screen.getByText("Wrong button!")).toBeTruthy();
    expect(screen.getByText("YOU")).toBeTruthy();
  });

  it("renders mistake in direction phase with aiDirection set — uses direction icon branch", () => {
    setHistory([
      {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "too_early",
        aiInput: "left",
        playerInput: null,
      },
    ]);
    renderHistory();
    expect(screen.getByText("Too early!")).toBeTruthy();
    expect(screen.getByText("AI")).toBeTruthy();
  });

  it("renders round followed by mistake", () => {
    setHistory([
      {
        type: "round",
        isDirectionRound: false,
        choosePhase: "scissors",
        aiChoice: "rock",
        playerChoice: "paper",
        roundResult: "win",
      },
      {
        type: "mistake",
        choosePhase: "scissors",
        mistakeReason: "too_late",
        aiInput: "scissors",
        playerInput: null,
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
        isDirectionRound: false,
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
        isDirectionRound: false,
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
        isDirectionRound: false,
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
        aiInput: "paper",
        playerInput: null,
      },
    ]);
    renderHistory();
    expect(screen.getByText("Too late!")).toBeTruthy();
    expect(screen.getByText("AI")).toBeTruthy();
  });
});
