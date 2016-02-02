// Dependencies
var d3 = require('d3');
var request = require('d3-request');
require("d3-geo-projection")(d3);
var topojson = require('topojson');
var _ = require('lodash');

var fm = require('./fm');
var throttle = require('./throttle');
var features = require('./detectFeatures')();

// Globals
var DEFAULT_WIDTH = 640;
var MOBILE_THRESHOLD = 600;

var CENTRAL_AFRICA = [
	'AGO',
	'CAF',
	'CMR',
	'COD',	// Dem. Rep. of the Congo
	'COG',
	'GAB',
	'GNQ',	// Equatorial Guinea
	'STP',
	'TCD'	// Chad
];

var LABEL_DEFAULTS = {
    'text-anchor': 'middle',
		'font-size': 1,
		'rotate': 0
};

var LABELS = [
	{
		'text': 'Angola',
		'loc': [17.5, -12]
	},
	{
		'text': '<tspan dx="13%">Central African</tspan><tspan dx="-13%" dy="2.25%">Republic</tspan>',
		'loc': [14.25, 6.75],
		'font-size': 1
	},
	{
		'text': 'Cameroon',
		'loc': [11.75, 5],
		'font-size': 0.9
	},
	{
		'text': 'Chad',
		'loc': [18.5, 14]
	},
	{
		'text': '<tspan dx="18.5%">Democratic Republic</tspan><tspan dx="-18.5%" dy="2.25%">of the Congo</tspan>',
		'loc': [13.25, -3]
	},
	{
		'text': '<tspan dx="9.5%">Equatorial</tspan><tspan dx="-9.5%" dy="2.25%">Guinea</tspan>',
		'loc': [-5, 3],
		'text-anchor': 'end'
	},
	{
		'text': 'Gabon',
		'loc': [11.75, -0.75]
	},
	{
		'text': '<tspan dx="12.25%">Republic</tspan><tspan dx="-12.25%" dy="2.25%">of the Congo</tspan>',
		'loc': [-7.5, -6]
	},
	{
		'text': '<tspan dx="12.5%">São Tomé</tspan><tspan dx="-12.5%" dy="2.25%">and Príncipe</tspan>',
		'loc': [-6, -1],
		'text-anchor': 'end'
	}
];

var ARROWS = [
	// Sao Tome and Principe
	{
		'path': [
			[0, -1],
			[4, -1],
			[6.25, 0.15]
		]
	},
	// Equatorial Guinea
	{
		'path': [
			[0.5, 2.75],
			[4, 2],
			[9.5, 1.75]
		]
	},
	// Rep. of the Congo
	{
		'path': [
			[1, -6],
			[8, -6],
			[11.5, -4.5]
		]
	},
];

var countriesData = null;

var isMobile = false;

function init() {
  request.requestJson('data/countries.json', function(error, data) {
    countriesData = topojson.feature(data, data['objects']['ne_50m_admin_0_countries']);

    render();
    $(window).resize(throttle(onResize, 250));
  });
}

function onResize() {
  render()
}

function render() {
  var width = $('#map').width();

  if (width <= MOBILE_THRESHOLD) {
      isMobile = true;
  } else {
      isMobile = false;
  }

  renderMap({
    container: '#map',
    width: width,
    countries: countriesData
  });

  // Resize
  fm.resize()
}

/*
 * Render a map.
 */
function renderMap(config) {
    /*
     * Setup
     */
    var aspectRatio = 1 / 1.25;
    var defaultScale = 825;

    var margins = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };

    // Calculate actual chart dimensions
    var width = config['width'];
    var height = width / aspectRatio;

    var chartWidth = width - (margins['left'] + margins['right']);
    var chartHeight = height - (margins['top'] + margins['bottom']);

    var mapCenter = [10, 2];
    var scaleFactor = chartWidth / DEFAULT_WIDTH;
    var mapScale = scaleFactor * defaultScale;

    var projection = d3.geo.robinson()
      .center(mapCenter)
      .translate([width / 2, height / 2])
      .scale(mapScale);

    var geoPath = d3.geo.path()
      .projection(projection)

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
      .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
      .attr('width', chartWidth + margins['left'] + margins['right'])
      .attr('height', chartHeight + margins['top'] + margins['bottom'])
      .append('g')
      .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create geographic elements.
     */
    var countries = chartElement.append('g')
      .attr('class', 'countries');

    countries.selectAll('path')
      .data(config['countries']['features'])
      .enter().append('path')
        .attr('id', function(d) {
          return d['id'];
        })
				.attr('class', function(d) {
					if (_.indexOf(CENTRAL_AFRICA, d['id']) >= 0) {
						return 'central-africa';
					}

					return '';
				})
        .attr('d', geoPath);

		chartElement.append('defs')
	 		.append('marker')
	 		.attr('id','arrowhead')
	 		.attr('orient','auto')
	 		.attr('viewBox','0 0 5.108 8.18')
	 		.attr('markerHeight','8.18')
	 		.attr('markerWidth','5.108')
	 		.attr('orient','auto')
	 		.attr('refY','4.09')
	 		.attr('refX','5')
	 		.append('polygon')
	 		.attr('points','0.745,8.05 0.07,7.312 3.71,3.986 0.127,0.599 0.815,-0.129 5.179,3.999')
	 		.attr('fill','#4C4C4C')

		var arrowLine = d3.svg.line()
			.interpolate('basis')
			.x(function(d) {
				return projection(d)[0];
			})
			.y(function(d) {
				return projection(d)[1];
			});

		var arrows = chartElement.append('g')
			.attr('class', 'arrows');

		arrows.selectAll('path')
			.data(ARROWS)
			.enter().append('path')
			.attr('d', function(d) { return arrowLine(d['path']); })
			.style('marker-end', 'url(#arrowhead)');

    var labels = chartElement.append('g')
      .attr('class', 'labels');

    labels.selectAll('text')
      .data(LABELS)
      .enter().append('text')
				.attr('transform', function(d) {
						var rotate = d['rotate'] || LABEL_DEFAULTS['rotate'];
	          return 'translate(' + projection(d['loc']) + ') rotate(' + rotate + ')';
				})
				.style('text-anchor', function(d) {
					return d['text-anchor'] || LABEL_DEFAULTS['text-anchor'];
				})
				.style('font-size', function(d) {
					return ((d['font-size'] || LABEL_DEFAULTS['font-size']) * scaleFactor * 100).toString() + '%';
				})
        .html(function(d) {
					return d['text'];
				});
}

$(document).ready(function () {
  init();
});
