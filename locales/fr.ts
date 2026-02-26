import type en from "./en";

type DeepString<T> = {
  [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string;
};

export default {
  home: {
    title: "Chifoumi",
    classicMode: "Classique",
    directionsMode: "Directions",
  },
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
    goHome: "Accueil",
    tooEarly: "Trop tôt !",
    tooLate: "Trop tard !",
    wrongType: "Mauvais bouton !",
    idle: "Appuyez sur Commencer",
    confirmWin: "Confirmé !",
    aiConfirms: "Ils ont confirmé !",
    directionMiss: "Mauvaise direction !",
    vs: "vs",
    attemptsLeft_one: "{{count}} essai restant",
    attemptsLeft_other: "{{count}} essais restants",
    result: {
      win: "Gagné !",
      lose: "Perdu !",
      draw: "Égalité !",
    },
    direction: {
      up: "Haut",
      down: "Bas",
      left: "Gauche",
      right: "Droite",
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
