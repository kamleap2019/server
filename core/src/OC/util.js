/* global t */

/*
 * @copyright 2019 Christoph Wurst <christoph@winzerhof-wurst.at>
 *
 * @author 2019 Christoph Wurst <christoph@winzerhof-wurst.at>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import $ from 'jquery'
import moment from 'moment'

import History from './util-history'
import OC from './index'
import humanFileSize from '../Util/human-file-size'

function chunkify(t) {
	// Adapted from http://my.opera.com/GreyWyvern/blog/show.dml/1671288
	let tz = [], x = 0, y = -1, n = 0, code, c;

	while (x < t.length) {
		c = t.charAt(x);
		// only include the dot in strings
		var m = ((!n && c === '.') || (c >= '0' && c <= '9'));
		if (m !== n) {
			// next chunk
			y++;
			tz[y] = '';
			n = m;
		}
		tz[y] += c;
		x++;
	}
	return tz;
}

/**
 * Utility functions
 * @namespace OC.Util
 */
export default {

	History,

	// TODO: remove original functions from global namespace
	humanFileSize,

	/**
	 * Returns a file size in bytes from a humanly readable string
	 * Makes 2kB to 2048.
	 * Inspired by computerFileSize in helper.php
	 * @param  {string} string file size in human readable format
	 * @return {number} or null if string could not be parsed
	 *
	 *
	 */
	computerFileSize: function (string) {
		if (typeof string !== 'string') {
			return null;
		}

		var s = string.toLowerCase().trim();
		var bytes = null;

		var bytesArray = {
			'b': 1,
			'k': 1024,
			'kb': 1024,
			'mb': 1024 * 1024,
			'm': 1024 * 1024,
			'gb': 1024 * 1024 * 1024,
			'g': 1024 * 1024 * 1024,
			'tb': 1024 * 1024 * 1024 * 1024,
			't': 1024 * 1024 * 1024 * 1024,
			'pb': 1024 * 1024 * 1024 * 1024 * 1024,
			'p': 1024 * 1024 * 1024 * 1024 * 1024
		};

		var matches = s.match(/^[\s+]?([0-9]*)(\.([0-9]+))?( +)?([kmgtp]?b?)$/i);
		if (matches !== null) {
			bytes = parseFloat(s);
			if (!isFinite(bytes)) {
				return null;
			}
		} else {
			return null;
		}
		if (matches[5]) {
			bytes = bytes * bytesArray[matches[5]];
		}

		bytes = Math.round(bytes);
		return bytes;
	},

	/**
	 * @param timestamp
	 * @param format
	 * @returns {string} timestamp formatted as requested
	 */
	formatDate: function (timestamp, format) {
		format = format || "LLL";
		return moment(timestamp).format(format);
	},

	/**
	 * @param timestamp
	 * @returns {string} human readable difference from now
	 */
	relativeModifiedDate: function (timestamp) {
		var diff = moment().diff(moment(timestamp));
		if (diff >= 0 && diff < 45000) {
			return t('core', 'seconds ago');
		}
		return moment(timestamp).fromNow();
	},

	/**
	 * Returns whether this is IE
	 *
	 * @return {bool} true if this is IE, false otherwise
	 */
	isIE: function () {
		return $('html').hasClass('ie');
	},

	/**
	 * Returns the width of a generic browser scrollbar
	 *
	 * @return {int} width of scrollbar
	 */
	getScrollBarWidth: function () {
		if (this._scrollBarWidth) {
			return this._scrollBarWidth;
		}

		var inner = document.createElement('p');
		inner.style.width = "100%";
		inner.style.height = "200px";

		var outer = document.createElement('div');
		outer.style.position = "absolute";
		outer.style.top = "0px";
		outer.style.left = "0px";
		outer.style.visibility = "hidden";
		outer.style.width = "200px";
		outer.style.height = "150px";
		outer.style.overflow = "hidden";
		outer.appendChild(inner);

		document.body.appendChild(outer);
		var w1 = inner.offsetWidth;
		outer.style.overflow = 'scroll';
		var w2 = inner.offsetWidth;
		if (w1 === w2) {
			w2 = outer.clientWidth;
		}

		document.body.removeChild(outer);

		this._scrollBarWidth = (w1 - w2);

		return this._scrollBarWidth;
	},

	/**
	 * Remove the time component from a given date
	 *
	 * @param {Date} date date
	 * @return {Date} date with stripped time
	 */
	stripTime: function (date) {
		// FIXME: likely to break when crossing DST
		// would be better to use a library like momentJS
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	},

	/**
	 * Compare two strings to provide a natural sort
	 * @param a first string to compare
	 * @param b second string to compare
	 * @return -1 if b comes before a, 1 if a comes before b
	 * or 0 if the strings are identical
	 */
	naturalSortCompare: function (a, b) {
		var x;
		var aa = chunkify(a);
		var bb = chunkify(b);

		for (x = 0; aa[x] && bb[x]; x++) {
			if (aa[x] !== bb[x]) {
				var aNum = Number(aa[x]), bNum = Number(bb[x]);
				// note: == is correct here
				if (aNum == aa[x] && bNum == bb[x]) {
					return aNum - bNum;
				} else {
					// Note: This locale setting isn't supported by all browsers but for the ones
					// that do there will be more consistency between client-server sorting
					return aa[x].localeCompare(bb[x], OC.getLanguage());
				}
			}
		}
		return aa.length - bb.length;
	},

	/**
	 * Calls the callback in a given interval until it returns true
	 * @param {function} callback
	 * @param {integer} interval in milliseconds
	 */
	waitFor: function (callback, interval) {
		var internalCallback = function () {
			if (callback() !== true) {
				setTimeout(internalCallback, interval);
			}
		};

		internalCallback();
	},

	/**
	 * Checks if a cookie with the given name is present and is set to the provided value.
	 * @param {string} name name of the cookie
	 * @param {string} value value of the cookie
	 * @return {boolean} true if the cookie with the given name has the given value
	 */
	isCookieSetToValue: function (name, value) {
		var cookies = document.cookie.split(';');
		for (var i = 0; i < cookies.length; i++) {
			var cookie = cookies[i].split('=');
			if (cookie[0].trim() === name && cookie[1].trim() === value) {
				return true;
			}
		}
		return false;
	}
}
