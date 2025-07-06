// scripts/settings.js
// Centralize aqui valores-padrão que serão reutilizados em todas as visualizações.

const SETTINGS = {
  dims: {
    widthFactor: .6,  // % da largura da janela
    heightFactor: 1    // % da altura da janela
  },


  colorScheme: [
    "#66c2a5",
    "#fc8d62",
    "#8da0cb",
    "#e78ac3",
    "#a6d854"
  ],


  node: {
    radius: 7,
    stroke: "#fff",
    strokeWidth: 1
  },

  forces: {
    collideRadius: 7,
    collideStrength: 1,
    xStrength: 0.05,
    yStrength: 0.05,
    alphaDecay: 0.02,          // taxa de decaimento mais alta → converge mais rápido
    velocityDecay: 0.35,        // reduz a inércia dos nós
    dragAlphaTarget: 2       // “reaquece” na hora do drag
  },

  labelYOffset: 100
};

export default SETTINGS;
