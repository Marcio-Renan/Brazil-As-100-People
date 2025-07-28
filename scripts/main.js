import SETTINGS from "./settings.js";
import "./toggle.js";

const d3Viz = d3.select("#d3-viz");
let sharedD3 = {};
let onExitHandlers = [];

function assignInitialPositions(nodes, geoData, width, height) {
  // AJUSTE: O scaleFactor foi ajustado para 0.9 para melhor visualização e consistência.
  const scaleFactor = 0.3;
  const marginX = (width * (1 - scaleFactor)) / 2;
  const marginY = (height * (1 - scaleFactor)) / 2;

  const projection = d3
    .geoMercator()
    .fitSize([width * scaleFactor, height * scaleFactor], geoData);
  const bounds = d3.geoBounds(geoData);

  let gridPoints = [];
  let step = 3.0;

  while (gridPoints.length < 100) {
    gridPoints = [];
    step *= 0.95;

    if (step < 0.05) {
      console.error("Não foi possível gerar 100 pontos para o grid.");
      nodes.forEach((node) => {
        node.initialX = Math.random() * width;
        node.initialY = Math.random() * height;
      });
      return;
    }

    for (let lat = bounds[1][1]; lat >= bounds[0][1]; lat -= step) {
      for (let lon = bounds[0][0]; lon <= bounds[1][0]; lon += step) {
        if (d3.geoContains(geoData, [lon, lat])) {
          gridPoints.push([lon, lat]);
        }
      }
    }
  }

  function selectEvenly(array, count) {
    const result = [];
    const total = array.length;
    if (total < count) return array;
    const interval = total / count;
    for (let i = 0; i < count; i++) {
      result.push(array[Math.floor(i * interval)]);
    }
    return result;
  }
  const finalGridPoints = selectEvenly(gridPoints, 100);

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  shuffleArray(finalGridPoints);

  nodes.forEach((node, i) => {
    if (finalGridPoints[i]) {
      const point = projection(finalGridPoints[i]);
      node.initialX = point[0] + marginX;
      node.initialY = point[1] + marginY;
    } else {
      node.initialX = width / 2;
      node.initialY = height / 2;
    }
  });
}
function processData(data) {
  const totals = {
    race: new Array(5).fill(0),
    age: new Array(5).fill(0),
    literacy: [0, 0],
    literacyByAge: [0, 0, 0, 0],
    ageByGender: new Array(6).fill(0).map(() => ({ men: 0, women: 0 })),
  };

  data.forEach((d) => {
    totals.race[0] += d.raca_parda;
    totals.race[1] += d.raca_branca;
    totals.race[2] += d.raca_preta;
    totals.race[3] += d.raca_amarela;
    totals.race[4] += d.raca_indigena;

    const age_0_14 = d.idade_0_4 + d.idade_5_9 + d.idade_10_14;
    const age_15_29 = d.idade_15_19 + d.idade_20_24 + d.idade_25_29;
    const age_30_49 = d.idade_30_39 + d.idade_40_49;
    const age_50_69 = d.idade_50_59 + d.idade_60_69;
    const totalLiterate =
      d.alfabetizadas_15_19 +
      d.alfabetizadas_20_24 +
      d.alfabetizadas_25_29 +
      d.alfabetizadas_30_34 +
      d.alfabetizadas_35_39 +
      d.alfabetizadas_40_44 +
      d.alfabetizadas_45_49 +
      d.alfabetizadas_50_54 +
      d.alfabetizadas_55_59 +
      d.alfabetizadas_60_64 +
      d.alfabetizadas_65_69 +
      d.alfabetizadas_70_79 +
      d.alfabetizadas_80_plus;
    const totalPop15Plus = age_15_29 + age_30_49 + age_50_69 + d.idade_70_plus;

    totals.age[0] += age_0_14;
    totals.age[1] += age_15_29;
    totals.age[2] += age_30_49;
    totals.age[3] += age_50_69;
    totals.age[4] += d.idade_70_plus;

    totals.literacy[0] += totalLiterate;
    totals.literacy[1] += totalPop15Plus - totalLiterate;

    totals.literacyByAge[0] += d.alfabetizadas_15_19 + d.alfabetizadas_20_24 + d.alfabetizadas_25_29;
    totals.literacyByAge[1] += d.alfabetizadas_30_34 + d.alfabetizadas_35_39 + d.alfabetizadas_40_44 + d.alfabetizadas_45_49;
    totals.literacyByAge[2] += d.alfabetizadas_50_54 + d.alfabetizadas_55_59 + d.alfabetizadas_60_64 + d.alfabetizadas_65_69;
    totals.literacyByAge[3] += d.alfabetizadas_70_79 + d.alfabetizadas_80_plus;

    // Soma os totais de idade por gênero
    const ageGroupsMen = [
      d.idade_homem_0_4 + d.idade_homem_5_9 + d.idade_homem_10_14,
      d.idade_homem_15_19 + d.idade_homem_20_24 + d.idade_homem_25_29,
      d.idade_homem_30_39 + d.idade_homem_40_49,
      d.idade_homem_50_59 + d.idade_homem_60_69,
      d.idade_homem_70_plus,
    ];
    const ageGroupsWomen = [
      d.idade_mulher_0_4 + d.idade_mulher_5_9 + d.idade_mulher_10_14,
      d.idade_mulher_15_19 + d.idade_mulher_20_24 + d.idade_mulher_25_29,
      d.idade_mulher_30_39 + d.idade_mulher_40_49,
      d.idade_mulher_50_59 + d.idade_mulher_60_69,
      d.idade_mulher_70_plus,
    ];

    for (let i = 0; i < 5; i++) {
      totals.ageByGender[0].men += ageGroupsMen[i];
      totals.ageByGender[i + 1].men += ageGroupsMen[i];
      totals.ageByGender[0].women += ageGroupsWomen[i];
      totals.ageByGender[i + 1].women += ageGroupsWomen[i];
    }
  });

  const percentages = {
    race: totals.race.map((v) => (v / d3.sum(totals.race)) * 100),
    age: totals.age.map((v) => (v / d3.sum(totals.age)) * 100),
    literacy: totals.literacy.map((v) => (v / d3.sum(totals.literacy)) * 100),
    literacyByAge: totals.literacyByAge.map(
      (v, i) => (v / (totals.age[i + 1] || 1)) * 100 // Previne divisão por zero
    ),
    ageByGender: totals.ageByGender.map((v) => {
      let totalPeopleInAgeGroup = v.men + v.women;
      return {
        men: (v.men / totalPeopleInAgeGroup) * 100,
        women: (v.women / totalPeopleInAgeGroup) * 100
      }
    })
  };

  const adjustAndRoundTo100 = (percentages) => {
    let rounded = percentages.map(Math.round);
    percentages.forEach((p, i) => {
      if (p > 0 && rounded[i] === 0) {
        rounded[i] = 1;
      }
    });
    let currentSum = d3.sum(rounded);
    while (currentSum !== 100) {
      if (currentSum > 100) {
        let maxIndex = rounded.indexOf(d3.max(rounded));
        if (rounded[maxIndex] > 1) {
          rounded[maxIndex]--;
        }
      } else {
        let maxIndex = rounded.indexOf(d3.max(rounded));
        rounded[maxIndex]++;
      }
      currentSum = d3.sum(rounded);
    }
    return rounded;
  };

  const finalCounts = {
    race: adjustAndRoundTo100(percentages.race),
    age: adjustAndRoundTo100(percentages.age),
    literacy: adjustAndRoundTo100(percentages.literacy),
    literacyByAge: adjustAndRoundTo100(percentages.literacyByAge),
    ageByGender: [],
  };

  totals.ageByGender.forEach((quantity, i) => {
    const totalPeopleInAgeGroup = quantity.men + quantity.women;
    if (totalPeopleInAgeGroup === 0) {
      finalCounts.ageByGender.push({ men: 0, women: 0 });
      return;
    }
    const menProportion = quantity.men / totalPeopleInAgeGroup;
    const menDots = Math.round(100 * menProportion);
    const womenDots = 100 - menDots;
    finalCounts.ageByGender.push({ men: menDots, women: womenDots });
  })

  const nodes = d3.range(100).map((id) => ({ id }));

  let r_i = 0, a_i = 0, l_i = 0, lba_i = 0, g_i = 0;
  let race_idx = 0, age_idx = 0, literacy_idx = 0, literacy_by_age_idx = 0;

  nodes.forEach((n) => {
    if (race_idx >= finalCounts.race[r_i]) { r_i++; race_idx = 0; }
    n.raceGroup = r_i;
    race_idx++;

    if (age_idx >= finalCounts.age[a_i]) { a_i++; age_idx = 0; }
    n.ageGroup = a_i;
    age_idx++;

    if (literacy_idx >= finalCounts.literacy[l_i]) { l_i++; literacy_idx = 0; }
    n.literacyGroup = l_i;
    literacy_idx++;

    if (literacy_by_age_idx >= finalCounts.literacyByAge[lba_i]) { lba_i++; literacy_by_age_idx = 0; }
    n.literacyByAgeGroup = lba_i;
    n.isLiterate = literacy_by_age_idx + 1 < percentages.literacyByAge[lba_i] / 4;
    literacy_by_age_idx++;
  });

  return { nodes, percentages, finalCounts };
}

function initializeVisualization(nodeData, geoData) {
  const width = d3Viz.node().getBoundingClientRect().width;
  const height = d3Viz.node().getBoundingClientRect().height;
  const svg = d3Viz.append("svg").attr("width", width).attr("height", height);

  nodeData.forEach((node) => {
    node.x = node.initialX;
    node.y = node.initialY;
  });

  const simulation = d3
    .forceSimulation(nodeData)
    .velocityDecay(SETTINGS.forces.velocityDecay)
    .alphaDecay(SETTINGS.forces.alphaDecay)
    .force(
      "collision",
      d3
        .forceCollide()
        .radius(SETTINGS.forces.collideRadius)
        .strength(SETTINGS.forces.collideStrength)
    );

  const nodeSelection = svg
    .append("g")
    .attr("id", "nodes-group")
    .selectAll("circle")
    .data(nodeData)
    .join("circle")
    .attr("opacity", 1)
    .attr("r", SETTINGS.node.radius)
    .attr("stroke", SETTINGS.node.stroke)
    .attr("stroke-width", SETTINGS.node.strokeWidth);

  const customSVG = {
    d: "M62.79,29.172l-28-28C34.009,0.391,32.985,0,31.962,0s-2.047,0.391-2.828,1.172l-28,28  c-1.562,1.566-1.484,4.016,0.078,5.578c1.566,1.57,3.855,1.801,5.422,0.234L8,33.617V60c0,2.211,1.789,4,4,4h16V48h8v16h16  c2.211,0,4-1.789,4-4V33.695l1.195,1.195c1.562,1.562,3.949,1.422,5.516-0.141C64.274,33.188,64.356,30.734,62.79,29.172z"
  }
  svg.select("g#nodes-group").append("symbol").attr("id", "house")
    .attr("viewBox", "0 0 64 64")
    .append("path").attr("d", customSVG.d)

  const labelSelection = svg.append("g").selectAll(".group-label");

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  nodeSelection.call(
    d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended)
  );

  const scaleFactor = 0.9;
  const marginX = (width * (1 - scaleFactor)) / 2;
  const marginY = (height * (1 - scaleFactor)) / 2;
  const projection = d3
    .geoMercator()
    .fitSize([width * scaleFactor, height * scaleFactor], geoData);
  function ticked() {
    nodeSelection.each(function (d) {
      const invertedPoint = projection.invert([d.x - marginX, d.y - marginY]);
      if (!d3.geoContains(geoData, invertedPoint)) {
        d.x = d.px || d.x;
        d.y = d.py || d.y;
      }
    });

    nodeSelection.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  }

  simulation.on("tick", ticked);
  sharedD3 = { simulation, nodeSelection, labelSelection, width, height };
}

function reapplyCollision() {
  const { simulation } = sharedD3;
  simulation.force(
    "collision",
    d3
      .forceCollide()
      .radius(SETTINGS.forces.collideRadius)
      .strength(SETTINGS.forces.collideStrength)
  )
}

function updateLabels(labelData) {
  sharedD3.labelSelection = sharedD3.labelSelection
    .data(labelData, (d) => d.text)
    .join(
      (enter) =>
        enter
          .append("text")
          .classed("group-label", true)
          .attr("x", (d) => d.x)
          .attr("y", (d) => d.y)
          .text((d) => d.text)
          .attr("opacity", 0)
          .style("fill", (d) => d.color ?? "var(--text-primary)")
          .call((enter) => enter.transition().duration(800).attr("opacity", 1)),
      (update) =>
        update.call((update) =>
          update
            .transition()
            .duration(800)
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y)
            .attr("opacity", 1)
        ),
      (exit) =>
        exit.call((exit) =>
          exit.transition().duration(400).attr("opacity", 0).remove()
        )
    )
    .on("mouseover", function (event, d) {
      d3.select(this).text(`${d.percentage.toFixed(1)}%`);
    })
    .on("mouseout", function (event, d) {
      d3.select(this).text(d.text);
    });
}

function transitionToInitial() {
  sharedD3.simulation
    .force(
      "x",
      d3.forceX((d) => d.initialX).strength(SETTINGS.forces.xStrength)
    )
    .force(
      "y",
      d3.forceY((d) => d.initialY).strength(SETTINGS.forces.yStrength)
    )
    .alpha(1)
    .restart();
  sharedD3.nodeSelection.transition().duration(800).attr("fill", "#009E60");
  updateLabels([]);
}

function transitionToRace(percentages) {
  const { simulation, nodeSelection, width, height } = sharedD3;
  const raceScale = d3
    .scalePoint()
    .domain(d3.range(SETTINGS.raceLabels.length))
    .range([width * 0.15, width * 0.85]);
  simulation
    .force(
      "x",
      d3
        .forceX((d) => raceScale(d.raceGroup))
        .strength(SETTINGS.forces.xStrength)
    )
    .force("y", d3.forceY(height / 2).strength(SETTINGS.forces.yStrength))
    .alpha(1)
    .restart();
  nodeSelection
    .transition()
    .duration(800)
    .attr("fill", (d) => SETTINGS.raceColors[d.raceGroup]);
  const labelData = SETTINGS.raceLabels.map((text, i) => ({
    text,
    percentage: percentages[i],
    x: raceScale(i),
    y: height * 0.25,
  }));
  updateLabels(labelData);
}

function transitionToAgePyramid(processedData) {
  const { simulation, nodeSelection, width, height } = sharedD3;
  const counts = processedData.finalCounts.age;
  const pyramidLayout = [];
  const rowHeight = 45;
  const nodeSpacing = SETTINGS.node.radius * 2.5;

  const totalPyramidHeight = (counts.length - 1) * rowHeight;
  let currentY = height / 2 + totalPyramidHeight / 2;

  for (let i = 0; i < counts.length; i++) {
    const numNodes = counts[i];
    const rowWidth = numNodes * nodeSpacing;
    const startX = (width - rowWidth) / 2;
    pyramidLayout.push({
      y: currentY,
      startX: startX,
      count: numNodes,
    });
    currentY -= rowHeight;
  }

  for (let ageGroup = 0; ageGroup < pyramidLayout.length; ageGroup++) {
    const layout = pyramidLayout[ageGroup];
    const nodesInGroup = processedData.nodes.filter(
      (n) => n.ageGroup === ageGroup
    );
    for (let i = 0; i < nodesInGroup.length; i++) {
      nodesInGroup[i].targetX = layout.startX + i * nodeSpacing;
      nodesInGroup[i].targetY = layout.y;
    }
  }

  simulation
    .force("x", d3.forceX((d) => d.targetX).strength(SETTINGS.forces.xStrength))
    .force("y", d3.forceY((d) => d.targetY).strength(SETTINGS.forces.yStrength))
    .force("collision", null)
    .alpha(1)
    .restart();

  nodeSelection
    .transition()
    .duration(800)
    .attr("fill", (d) => SETTINGS.ageColors[d.ageGroup]);

  const labelData = SETTINGS.ageLabels.map((text, i) => ({
    text: text,
    percentage: processedData.percentages.age[i],
    x: width - 70,
    y: pyramidLayout[i].y,
  }));
  updateLabels(labelData);
} function transitionToLiteracy(percentages) {
  const { simulation, nodeSelection, width, height } = sharedD3;
  const literacyLabels = ["Alfabetizados", "Não Alfabetizados"];

  // 1. Separar os nós em dois grupos: alfabetizados e não alfabetizados.
  const allNodes = nodeSelection.data();
  const literateNodes = allNodes.filter(d => d.literacyGroup === 0);
  const nonLiterateNodes = allNodes.filter(d => d.literacyGroup === 1);

  // 2. Obter todas as posições iniciais do mapa e ordená-las pela coordenada Y.
  // Isso nos permite saber quais posições estão mais ao "sul" (maior valor de Y).
  const mapPositions = allNodes.map(d => ({ x: d.initialX, y: d.initialY }))
    .sort((a, b) => b.y - a.y); // Ordena do maior Y (sul) para o menor Y (norte).

  // 3. Atribuir as posições do sul para os não alfabetizados e o resto para os alfabetizados.
  const southPositions = mapPositions.splice(0, nonLiterateNodes.length);
  const northPositions = mapPositions; // O que sobrou.

  // Embaralha as posições dentro de cada grupo para uma aparência mais natural.
  d3.shuffle(southPositions);
  d3.shuffle(northPositions);

  // Define as coordenadas de destino para cada nó.
  nonLiterateNodes.forEach((node, i) => {
    node.targetX = southPositions[i].x;
    node.targetY = southPositions[i].y;
  });
  literateNodes.forEach((node, i) => {
    node.targetX = northPositions[i].x;
    node.targetY = northPositions[i].y;
  });

  // 4. Aplica as forças para mover cada nó para seu novo destino.
  simulation
    .force("x", d3.forceX(d => d.targetX).strength(SETTINGS.forces.xStrength))
    .force("y", d3.forceY(d => d.targetY).strength(SETTINGS.forces.yStrength))
    .alpha(1)
    .restart();

  // 5. Colore os nós de acordo com o grupo.
  nodeSelection
    .transition()
    .duration(800)
    .attr("fill", (d) => SETTINGS.literacyColors[d.literacyGroup]);

  // 6. Aproxima as legendas.
  const labelData = literacyLabels.map((text, i) => ({
    text,
    percentage: percentages[i],
    x: width * 0.15,
    y: height * 0.15 + (i * 22), // A distância vertical foi reduzida de 30 para 22.
    color: SETTINGS.literacyColors[i]
  }));

  updateLabels(labelData);
}

function transitionToLiteracyByAge(percentages) {
  const { simulation, nodeSelection, width, height } = sharedD3;
  const literacyLabels = SETTINGS.literacyByAge.labels;
  const ageScale = d3
    .scalePoint()
    .domain(d3.range(literacyLabels.length))
    .range([width * 0.1, width * 0.9]);
  simulation
    .force(
      "x",
      d3
        .forceX((d) => ageScale(d.literacyByAgeGroup))
        .strength(SETTINGS.forces.xStrength)
    )
    .force("y", d3.forceY(height / 2).strength(SETTINGS.forces.yStrength))
    .alpha(1)
    .restart();
  nodeSelection
    .transition()
    .duration(800)
    .attr("fill", (d) => SETTINGS.literacyColors[d.isLiterate ? 0 : 1]);
  const labelData = literacyLabels.map((text, i) => ({
    text,
    percentage: percentages[i],
    x: ageScale(i),
    y: height * 0.25,
  }));
  updateLabels(labelData);
}

function transitionToGender(data) {
  const { simulation, nodeSelection, width, height } = sharedD3;

  const layout = [];
  const nodeSpacing = SETTINGS.node.radius * 2.5;

  const baseHeight = 8 * nodeSpacing;
  let currentY = height / 2 - baseHeight / 2;

  const labels = SETTINGS.gender.labels;
  const scale = d3
    .scalePoint()
    .domain(d3.range(labels.length))
    .range([width * 0.35, width * 0.65]);

  for (let i = 0; i < 2; i++) {
    const numNodes = 8;
    const rowWidth = numNodes * nodeSpacing;
    const startX = scale(i) + nodeSpacing / 2 - (rowWidth / 2);
    layout.push({
      startY: currentY,
      startX: startX,
    });
  }

  function setupNodes(counts, nodes, percentages) {
    let i = 0;
    Object.values(counts).forEach((quantity, genderGroup) => {
      const currentLayout = layout[genderGroup];
      let rowIndex = 0;
      for (let groupIndex = 0; groupIndex < quantity; i++, groupIndex++) {
        nodes[i].targetX = currentLayout.startX + rowIndex * nodeSpacing;
        nodes[i].targetY = currentLayout.startY + (Math.trunc(groupIndex / 8) * nodeSpacing);
        nodes[i].genderGroup = genderGroup;
        rowIndex++;
        if (rowIndex % 8 === 0) {
          rowIndex = 0;
        }
      }
    })

    simulation
      .force("x", d3.forceX((d) => d.targetX).strength(SETTINGS.forces.xStrength))
      .force("y", d3.forceY((d) => d.targetY).strength(SETTINGS.forces.yStrength))
      .force("collision", null)
      .alpha(1)
      .restart();

    nodeSelection
      .transition()
      .duration(800)
      .attr("fill", (d) => SETTINGS.gender.colors[d.genderGroup ? "female" : "male"]);

    const labelData = labels.map((text, i) => ({
      text,
      percentage: Object.values(percentages)[i],
      x: scale(i),
      y: height * 0.25,
    }));
    updateLabels(labelData);
  }

  const counts = data.finalCounts.ageByGender;
  const percentages = data.percentages.ageByGender;


  const selectDiv = d3Viz.append("div").attr("style", `position: absolute; top: ${height * 0.05}px; left: -${width * 0.5}px;`);

  const t = d3.transition().duration(500);
  selectDiv.transition(t).style("left", `${width * 0.05}px`)
  selectDiv.append("label").attr("for", "age-range").classed("group-label", true).text("Selecione a faixa etária: ");
  const selectElement = selectDiv.append("select").attr("id", "age-range");
  const possibleValues = ["Todos", "0-14 anos", "15-29 anos", "30-49 anos", "50-69 anos", "70+ anos"];
  selectElement.selectAll("option").data(possibleValues).join("option").attr("value", (d, i) => i).text(d => d);
  selectElement.on("change", (d) => setupNodes(counts[d.target.value], data.nodes, percentages[d.target.value]));

  setupNodes(counts[0], data.nodes, percentages[0]);

  onExitHandlers.push(() => selectDiv.transition().duration(500).style("left", `-${width * 0.5}px`).remove());
}

// ===== BLOCO DE CÓDIGO PARA ADICIONAR: BANDEIRA (APENAS LINHAS) =====
function transitionToFlag(nodes) {
  const { simulation, nodeSelection, width, height } = sharedD3;

  // 1. Geometria e Escala da Bandeira
  const svgWidth = 300;
  const svgHeight = 200;

  // Altere este valor (ex: 0.8 para 80%, 0.6 para 60%) para redimensionar a bandeira.
  const flagSizePercentage = 0.5;

  const flagWidth = width * flagSizePercentage;
  const flagHeight = (flagWidth * svgHeight) / svgWidth;
  const marginX = (width - flagWidth) / 2;
  const marginY = (height - flagHeight) / 2;

  const scaleX = d3.scaleLinear().domain([0, svgWidth]).range([marginX, marginX + flagWidth]);
  const scaleY = d3.scaleLinear().domain([0, svgHeight]).range([marginY, marginY + flagHeight]);

  // 2. Definição das Formas, Cores e Contagem Proporcional ao Perímetro
  const counts = { green: 54, yellow: 31, blue: 15 }; // Proporcional aos perímetros
  const colors = SETTINGS.flag.colors;
  const flagPoints = [];

  // Função auxiliar para gerar pontos ao longo de um caminho poligonal
  function generatePointsOnPath(vertices, numPoints, color) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = "M" + vertices.map(p => `${p.x},${p.y}`).join(" L ") + " Z";
    path.setAttribute("d", d);

    const totalLength = path.getTotalLength();
    if (totalLength === 0) return;

    for (let i = 0; i < numPoints; i++) {
      const point = path.getPointAtLength(i * (totalLength / numPoints));
      flagPoints.push({ x: scaleX(point.x), y: scaleY(point.y), color: color });
    }
  }

  // 3. Geração dos Pontos sobre as Linhas de Cada Forma
  const rectVertices = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 200 }, { x: 0, y: 200 }];
  generatePointsOnPath(rectVertices, counts.green, colors.green);

  const rhombusVertices = [{ x: 150, y: 25 }, { x: 275, y: 100 }, { x: 150, y: 175 }, { x: 25, y: 100 }];
  generatePointsOnPath(rhombusVertices, counts.yellow, colors.yellow);

  const circleDef = { cx: 150, cy: 100, r: 45 };
  for (let i = 0; i < counts.blue; i++) {
    const angle = (i / counts.blue) * 2 * Math.PI;
    const x = circleDef.cx + circleDef.r * Math.cos(angle);
    const y = circleDef.cy + circleDef.r * Math.sin(angle);
    flagPoints.push({ x: scaleX(x), y: scaleY(y), color: colors.blue });
  }

  // 4. Atribuição de Posições e Atualização da Visualização
  d3.shuffle(flagPoints);
  nodes.forEach((node, i) => {
    if (flagPoints[i]) {
      node.targetX = flagPoints[i].x;
      node.targetY = flagPoints[i].y;
      node.flagColor = flagPoints[i].color;
    }
  });

  simulation
    .force("x", d3.forceX(d => d.targetX).strength(SETTINGS.forces.xStrength))
    .force("y", d3.forceY(d => d.targetY).strength(SETTINGS.forces.yStrength))
    .force("collision", null)
    .alpha(1)
    .restart();

  nodeSelection
    .transition()
    .duration(800)
    .attr("fill", d => d.flagColor || "grey");

  updateLabels([]);
}
// ===== BLOCO DE CÓDIGO PARA SUBSTITUIR: transitionToAgeGenderPyramid =====
function transitionToAgeGenderPyramid(processedData) {
  const { simulation, nodeSelection, width, height } = sharedD3;

  const ageGenderCounts = processedData.finalCounts.ageByGender;
  const rowHeight = 45;
  const nodeSpacing = SETTINGS.node.radius * 2.5;
  const pyramidGap = SETTINGS.node.radius * 2;

  const totalPyramidHeight = (ageGenderCounts.length - 1) * rowHeight;
  let currentY = height / 2 + totalPyramidHeight / 2;

  const allNodes = nodeSelection.data();

  ageGenderCounts.forEach((group, i) => {
    const menInGroup = allNodes.filter(n => n.ageGroup === i && n.genderGroup === 0);
    const womenInGroup = allNodes.filter(n => n.ageGroup === i && n.genderGroup === 1);

    // Layout para homens (à esquerda, partindo do centro para fora)
    for (let j = 0; j < menInGroup.length; j++) {
      menInGroup[j].targetX = (width / 2) - (pyramidGap / 2) - (j * nodeSpacing);
      menInGroup[j].targetY = currentY;
    }

    // Layout para mulheres (à direita, partindo do centro para fora)
    for (let j = 0; j < womenInGroup.length; j++) {
      womenInGroup[j].targetX = (width / 2) + (pyramidGap / 2) + (j * nodeSpacing);
      womenInGroup[j].targetY = currentY;
    }

    currentY -= rowHeight;
  });

  simulation
    .force("x", d3.forceX((d) => d.targetX).strength(SETTINGS.forces.xStrength))
    .force("y", d3.forceY((d) => d.targetY).strength(SETTINGS.forces.yStrength))
    .force("collision", null)
    .alpha(1)
    .restart();

  nodeSelection
    .transition()
    .duration(800)
    .attr("fill", (d) => SETTINGS.gender.colors[d.genderGroup === 0 ? "male" : "female"]);

  const ageLabelsData = SETTINGS.ageLabels.map((text, i) => {
    const yPos = (height / 2 + totalPyramidHeight / 2) - (i * rowHeight);
    return { text: text, x: width / 2, y: yPos, color: '#555' };
  });

  const genderLabelsData = [
    { text: "Homens", x: width / 2 - pyramidGap - 50, y: height / 2 - totalPyramidHeight / 2 - 35 },
    { text: "Mulheres", x: width / 2 + pyramidGap + 50, y: height / 2 - totalPyramidHeight / 2 - 35 }
  ];

  updateLabels([...ageLabelsData, ...genderLabelsData]);
}

function transitionToHomes(processedData) {
  const { simulation, nodeSelection, width, height } = sharedD3;
  const nodesGroup = d3.select("#nodes-group");

  const houseSize = 20;

  simulation.stop();

  const nodeSpacing = houseSize * 1.25;

  const baseHeight = 10 * nodeSpacing;
  let startY = height / 2 - baseHeight / 2;
  let startX = width / 2 - baseHeight / 2;

  const labels = ["Com água encanada", "Sem água encanada"];
  const percentages = [97.59, 2.41]

  const nodes = processedData.nodes;
  let index = 0;
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      nodes[index].x = startX + j * nodeSpacing;
      nodes[index].y = startY + i * nodeSpacing;
      nodes[index].waterGroup = index > 97 ? 0 : 1;
      index++;
    }
  }

  const removedNodes = nodeSelection.transition().duration(250).attr("opacity", 0).remove();

  const houses = nodesGroup.selectAll("use").data(processedData.nodes)
    .join("use")
    .attr("href", "#house")
    .attr("width", houseSize)
    .attr("height", houseSize)
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .attr("opacity", 0)
    .attr("fill", d => d.waterGroup ? "#3279a8" : "#fa4b4b")

  houses.transition()
    .delay(250)
    .duration(250)
    .attr("opacity", 1)

  const labelData = labels.map((text, i) => ({
    text,
    percentage: percentages[i],
    x: width * 0.15,
    y: height * 0.15 + (i * 22), // A distância vertical foi reduzida de 30 para 22.
    color: i ? "#fa4b4b" : "#3279a8"
  }));

  updateLabels(labelData);

  onExitHandlers.push(() => {
    houses.transition().duration(250).attr("opacity", 0).remove();
    for (const element of removedNodes) {
      nodesGroup.append(() => element);
    }
    nodeSelection
      .attr("opacity", 1);
  })
}

function setupObserver(processedData) {
  const observer = new IntersectionObserver(
    (entries) => {
      reapplyCollision();
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          for (let i = onExitHandlers.length - 1; i >= 0; i--) {
            onExitHandlers[i]();
            onExitHandlers.pop();
          }
          const step = entry.target.id;
          switch (step) {
            case "step-initial":
              return transitionToInitial();
            case "step-race":
              return transitionToRace(processedData.percentages.race);
            case "step-age":
              return transitionToAge(processedData.percentages.age);
            case "step-age-pyramid":
              return transitionToAgePyramid(processedData);
            case "step-age-gender-pyramid":
              return transitionToAgeGenderPyramid(processedData);
            case "step-literacy":
              return transitionToLiteracy(processedData.percentages.literacy);
            case "step-literacy-age":
              return transitionToLiteracyByAge(
                processedData.percentages.literacyByAge
              );
            case "step-gender":
              return transitionToGender(processedData);
            case "step-home":
              return transitionToHomes(processedData);
            case "step-flag": // Etapa da bandeira adicionada
              return transitionToFlag(processedData.nodes);
          }
        }
      });
    },
    { threshold: 0.65 }
  );
  document.querySelectorAll(".step").forEach((step) => observer.observe(step));
}

Promise.all([
  d3.csv("data/data.csv", d3.autoType),
  d3.json("data/brasil_simple_shape.json"),
])
  .then(([data, geoData]) => {
    const processedData = processData(data);
    const width = d3Viz.node().getBoundingClientRect().width;
    const height = d3Viz.node().getBoundingClientRect().height;

    assignInitialPositions(processedData.nodes, geoData, width, height);
    initializeVisualization(processedData.nodes, geoData);
    setupObserver(processedData);
    transitionToInitial();
  })
  .catch((error) => {
    console.error(
      "Erro ao carregar os dados. Verifique se os arquivos 'ibge.csv' e 'brasil_simple_shape.json' estão na pasta 'data'.",
      error
    );
  });
