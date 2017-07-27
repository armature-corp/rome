'use strict';

var momentum = require('./momentum');

function raw (date, format) {
  if (typeof date === 'string') {
    return momentum.moment(date, format);
  }
  if (Object.prototype.toString.call(date) === '[object Date]') {
    return momentum.moment(date);
  }
  if (momentum.isMoment(date)) {
    return date.clone();
  }
}

function parse (date, format) {
  if( typeof format !== 'string' ) {
    format = null;
  }

  var m = momentum.moment( date, format, true );
  return m.isValid() ? m : null;
}

module.exports = parse;
