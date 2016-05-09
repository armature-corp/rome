'use strict';

function value(elem, value) {
	if(arguments.length === 2) {
		elem.value = value;
	}
	return elem.value;
}

module.exports = value;