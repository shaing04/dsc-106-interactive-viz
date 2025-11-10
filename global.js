// global.js — drop-in replacement
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.json('cmip_california_precip.json');
  return data;
}

let allData = await loadData();

const months = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec'
];

// flatten rows {model, year, month, value}
const rows = allData.flatMap(d =>
  months.map(m => ({
    model: d.model,
    year: +d.year,
    month: m,
    value: d.mean_pr[m],
  }))
);


// select models
const MODEL_A = 'ssp2-45';
const MODEL_B = 'ssp1-26';

// get parts of page
const left  = d3.select('#chartLeft');
const right = d3.select('#chartRight');
const slider = d3.select('#slider');
const sliderValue = d3.select('#sliderValue');

// get years
const years = Array.from(new Set(rows.map(r => r.year))).sort((a, b) => a - b);

// get year headers
const headerLeft  = d3.select('#headerLeft');
const headerRight = d3.select('#headerRight');

// select colors
const colorA = 'oklch(0.6029 0.1283 235.05)'; // blue
const colorB = 'oklch(0.7559 0.1579 69.88)';  // orange

// slider across year range
slider
  .attr('min', 0)
  .attr('max', years.length - 1)
  .attr('step', 1)
  .attr('value', 0); // this is the start year

function currentYear() {
  const idx = +slider.node().value;
  return years[Math.max(0, Math.min(idx, years.length - 1))];
}

//tooltip feature
const tooltip = d3.select('body')
  .append('div').attr('id', 'tooltip');

// draw chart at current year
function draw() {
  const year = currentYear();

  // slider label
  sliderValue.text(year);

  // set 12 months per year
  const dataA = rows.filter(r => r.model === MODEL_A && r.year === year);
  const dataB = rows.filter(r => r.model === MODEL_B && r.year === year);

  // update year headers
  if (!headerLeft.empty())  headerLeft.text(`Model SSP2.45 — ${year}`);
  if (!headerRight.empty()) headerRight.text(`Model SSP1.26 — ${year}`);

  drawBarChart(left,  dataA, colorA, year);
  drawBarChart(right, dataB, colorB, year);
}

// resizing
window.addEventListener('resize', draw, { passive: true });

// activate draw() with slider
slider.on('input', e => {
  sliderValue.text(years[+e.target.value]);
  draw();
});

// each chart template
function drawBarChart(container, data, color, year) {
  container.selectAll('*').remove();

  const node = container.node();
  const width = node.clientWidth;
  const height = node.clientHeight;
  const margin = { top: 10, right: 18, bottom: 38, left: 42 };

  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);

  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // x scale
  const x = d3.scaleBand()
    .domain(months)
    .range([0, innerW])
    .padding(0.18);

  // y scale
  const yMax = Math.max(11, d3.max(data, d => d.value) ?? 11);
  const y = d3.scaleLinear()
    .domain([0, yMax]).nice()
    .range([innerH, 0]);

  // gridlines
  const grid = g.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin}, 0)`)
    .call(d3.axisLeft(y).tickFormat('').tickSize(-innerW).ticks(5));
  
    grid.select('.domain').remove();

  // axes
  const axisColor = '#1d1f37';
  g.append('g')
    .attr('transform', `translate(0, ${innerH})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('fill', axisColor)
    .style('font-size', '12px');
 
  g.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .attr('fill', axisColor)
    .style('font-size', '12px');
  
  g.selectAll('.domain, .tick line').attr('stroke', 'rgba(0, 0, 0, 0.7)');
  grid.selectAll('line').attr('stroke', 'rgba(0, 0, 0, 0.15)');

  // bars
  g.selectAll('rect.bar')
    .data(data, d => d.month)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.month))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => innerH - y(d.value))
    .attr('fill', color)
    // .append('title')
    // .text(d => `${d.month.toUpperCase()}: ${d.value.toFixed(2)}`);
    .on('mouseenter', function(event, d) {
      d3.select(this).attr('opacity', 0.85);
      tooltip
        .style('opacity', 1)
        .html(`
          <div class="tt-month">${d.month.toUpperCase()} — ${year}</div>
          <div class="tt-value">${d.value.toFixed(2)} mm/day</div>
        `);
    })
    .on('mousemove', function(event) {
      tooltip
        .style('left', event.pageX + 6 + 'px')
        .style('top', (event.pageY -90) + 'px');
    })
    .on('mouseleave', function() {
      d3.select(this).attr('opacity', 1);
      tooltip.style('opacity', 0);
    });

  // x label
  svg.append('text')
    .attr('class', 'x label')
    .attr('text-anchor', 'middle')
    .attr('x', width / 2)
    .attr('y', height - margin.bottom / 30)
    .style('font-size', '12px')
    .style('fill', '#444')
    .text('Month');

  // y label
  svg.append('text')
    .attr('class', 'y label')
    .attr('text-anchor', 'middle')
    .attr('x', -(height / 2))
    .attr('y', margin.left / 3)
    .attr('transform', 'rotate(-90)')
    .style('font-size', '12px')
    .style('fill', '#444')
    .text('Avg Precipitation (mm/day)');
}

// render on page start
draw();