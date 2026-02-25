import type en from "./en";

type DeepString<T> = {
  [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string;
};

export default {
  game: {
    title: "Chifoumi",
    score: "Score : {{count}}",
    start: "Commencer",
    rock: "Pierre !",
    paper: "Papier !",
    scissors: "Ciseaux !",
    gameOver: "Partie terminée",
    finalScore: "Score final : {{count}}",
    restart: "Rejouer",
    tooEarly: "Trop tôt !",
    tooLate: "Trop tard !",
    idle: "Appuyez sur Commencer",
    result: {
      win: "Gagné !",
      lose: "Perdu !",
      draw: "Égalité !",
    },
  },
  settings: {
    title: "Paramètres",
    theme: "Thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeSystem: "Système",
    language: "Langue",
    langSystem: "Système",
    langEn: "English",
    langFr: "Français",
  },
} satisfies DeepString<typeof en>;
