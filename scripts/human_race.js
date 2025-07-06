import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import SETTINGS from "./settings.js";

const width  = window.innerWidth  * SETTINGS.dims.widthFactor;
const height = window.innerHeight * SETTINGS.dims.heightFactor;
const center = [width / 2, height / 2];

const color = d3.scaleOrdinal(
  d3.range(SETTINGS.colorScheme.length),
  SETTINGS.colorScheme
);

const labels = ["Parda", "Branca", "Preta", "Amarela", "Indigena"];
const campos = [
  "raca_parda",
  "raca_branca",
  "raca_preta",
  "raca_amarela",
  "raca_indigena"
];

const svg = d3.select("svg")
  .attr("width",  width)
  .attr("height", height);

d3.csv("data/ibge.csv", d3.autoType).then(data => {
  const totais = Array(campos.length).fill(0);
  data.forEach(d => campos.forEach((c,i) => totais[i] += d[c]));

  const totalPop = d3.sum(totais);
  const percentualPreciso = totais.map(v => (v/totalPop)*100);
  const percentual = percentualPreciso.map(v => Math.round(v));

  percentualPreciso.forEach((v,i) => {
    if (v < 1 && percentual[i] < 1) percentual[i] = 1;
  });

  let excesso = d3.sum(percentual) - 100;
  while (excesso > 0) {
    const idx = percentual.indexOf(d3.max(percentual));
    if (percentual[idx] > 1) {
      percentual[idx]--; excesso--;
    } else break;
  }
  while (d3.sum(percentual) < 100) {
    const idx = percentual.indexOf(d3.max(percentual));
    percentual[idx]++;
  }

  let group = 0, index = 1;
  const nodes = d3.range(100).map(id => {
    if (index > percentual[group]) {
      group++; index = 1;
    }
    index++;
    return { id, group };
  });

  const simulation = d3.forceSimulation(nodes)
    .velocityDecay(SETTINGS.forces.velocityDecay)
    .alphaDecay(SETTINGS.forces.alphaDecay)
    .force("collision",
      d3.forceCollide()
        .radius(SETTINGS.forces.collideRadius)
        .strength(SETTINGS.forces.collideStrength)
    )
    .force("x",
      d3.forceX(d => width*0.1 + d.group*width*0.2)
        .strength(SETTINGS.forces.xStrength)
    )
    .force("y",
      d3.forceY(height*0.5)
        .strength(SETTINGS.forces.yStrength)
    )
    .on("tick", ticked);

  nodes.forEach(n => {
    n.x = n.x*5 + (width*0.1 + n.group*width*0.2);
    n.y = n.y*5 + center[1];
  });

  const node = svg.append("g")
    .attr("stroke", SETTINGS.node.stroke)
    .attr("stroke-width", SETTINGS.node.strokeWidth)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", SETTINGS.node.radius)
    .attr("fill", d => color(d.group));

  svg.selectAll("text")
    .data(labels)
    .enter()
    .append("text")
    .text(d => d)
    .attr("x", (_,i) => width*0.1 + i*width*0.2)
    .attr("y", height*0.5 + SETTINGS.labelYOffset)
    .attr("text-anchor", "middle")
    .append("title")
    .text((_,i) => `${percentualPreciso[i].toFixed(2)}%`);

  node.call(d3.drag()
    .on("start", dragstarted)
    .on("drag",  dragged)
    .on("end",   dragended)
  );

  function ticked() {
    node.attr("cx", d => d.x).attr("cy", d => d.y);
  }

  function dragstarted(e) {
    if (!e.active) simulation.alphaTarget(SETTINGS.forces.dragAlphaTarget).restart();
    e.subject.fx = e.subject.x;
    e.subject.fy = e.subject.y;
  }

  function dragged(e) {
    e.subject.fx = e.x;
    e.subject.fy = e.y;
  }

  function dragended(e) {
    if (!e.active) simulation.alphaTarget(0);
    e.subject.fx = null;
    e.subject.fy = null;
  }
});
