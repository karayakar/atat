(function(){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AtCompiler = function () {
	function AtCompiler() {
		_classCallCheck(this, AtCompiler);
	}

	_createClass(AtCompiler, [{
		key: 'compile',
		value: function compile(input, ctx, callback) {
			var _this = this;

			try {
				var blocks = match_recursive(input, ctx.tags.open, ctx.tags.close);

				loop_async(blocks, function (block, i, array, callback) {

					try {

						if (block.name == VALUE_NAME_OUTSIDE) {

							if (block.value.trim() == '') {

								callback(null, '');

								return;
							}

							compile_inline.call(_this, block.value, ctx, callback);

							return;
						}

						if (block.name == VALUE_NAME_INSIDE) {

							var left = block.left,
							    inside = block,
							    right = block.right;

							var compiler = ctx.compiler(left.value);

							if (!compiler) {

								compile_inline.call(_this, left.value + inside.value + right.value, ctx, callback);

								return;
							}

							compiler.call(_this, inside, ctx, callback);

							return;
						}
					} catch (e) {

						callback(e);
					}
				}, function (err, results) {

					if (err) {

						return callback(err);
					}

					callback(null, results.join(''));
				});
			} catch (e) {
				callback(e);
			}
		}
	}]);

	return AtCompiler;
}();

function compile_inline(input, ctx, callback) {
	var _this2 = this;

	try {
		var blocks = match_inline(input, ctx.inline);

		loop_async(blocks, function (block, i, array, callback) {

			try {
				if (block.name == VALUE_NAME_OUTSIDE) {

					ctx.parts.push(block.value);
					callback(null, 'this.output += this.parts[' + (ctx.parts.length - 1) + '];');

					return;
				}

				if (block.name == VALUE_NAME_INSIDE) {

					var left = block.left,
					    inside = block,
					    right = block.right;

					if (inside.value.trim() == '') {

						callback(null, '');

						return;
					}

					var compiler = ctx.compiler(left.value + inside.value + right.value);

					if (!compiler) {
						output_call_helper.call(_this2, inside, ctx, callback);
						return;
					}

					compiler.call(_this2, inside, ctx, callback);

					return;
				}
			} catch (e) {

				callback(e);
			}
		}, function (err, results) {

			if (err) {

				return callback(err);
			}

			callback(null, results.join(''));
		});
	} catch (e) {
		callback(e);
	}
}

var AtContext = function () {
	function AtContext(opts) {
		var _this3 = this;

		_classCallCheck(this, AtContext);

		this.options = merge(Atat.options, opts);

		this.output = '';

		this.model = null;
		this.helpers = this.options.helpers;

		this.parts = [];

		this.arguments = [this.options.modelname, this.options.helpersname, 'body'].join(',');

		this.tags = get_tags(this.options.tags);
		this.inline = get_tags_inline(this.options.inline);

		this.tags.compilers = [];

		loop(this.options.tags, function (compiler, regexp) {
			_this3.tags.compilers.push({
				compiler: compiler,
				regexp: new RegExp(regexp, 'g')
			});
		});

		loop(this.options.inline, function (compiler, regexp) {
			_this3.tags.compilers.push({
				compiler: compiler,
				regexp: new RegExp(regexp, 'g')
			});
		});

		this.__layout = null;
		this.__partials = [];
		this.__sections = {};

		this.parent = null;
	}

	_createClass(AtContext, [{
		key: 'section',
		value: function section(name) {
			if (!name) {
				return null;
			}

			return this.__sections[name] || this.parent && this.parent.section(name);
		}
	}, {
		key: 'compiler',
		value: function compiler() {
			var str = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';


			for (var i = 0, l = this.tags.compilers.length; i < l; i++) {
				var item = this.tags.compilers[i];
				if (regexp_test(str, item.regexp)) {
					return item.compiler;
				}
			}

			return null;
		}
	}]);

	return AtContext;
}();

var Atat = function () {
	function Atat() {
		_classCallCheck(this, Atat);
	}

	_createClass(Atat, null, [{
		key: 'compileUri',
		value: function compileUri(uri) {
			var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
			var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};


			if (typeof opts === 'function') {
				callback = opts;
				opts = {};
			}

			Atat.fileLoader(uri, function (err, input) {
				if (err) {
					return callback(err);
				}
				Atat.compile(input, opts, callback);
			});
		}
	}, {
		key: 'compile',
		value: function compile(input) {
			var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
			var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};


			if (typeof opts === 'function') {
				callback = opts;
				opts = {};
			}

			var ctx = new AtContext(opts);

			var compiler = new AtCompiler();

			compiler.compile(input, ctx, function (err, output) {

				if (err) {
					return callback(err);
				}

				var render = new Function(ctx.arguments, output + ';return this.output;');

				ctx.template = function (model) {

					try {
						ctx.output = '';
						ctx.model = model || ctx.model;

						var body = render.call(ctx, ctx.model, ctx.helpers, ctx.body);

						if (ctx.__layout) {
							ctx.__layout.__context.body = body;
							body = ctx.__layout(ctx.model);
						}

						return body;
					} catch (e) {
						return e.toString();
					}
				};

				ctx.template.__context = ctx;

				callback(null, ctx.template);
			});
		}
	}]);

	return Atat;
}();

Atat.fileLoader = fileLoader;

Atat.options = {
	modelname: 'it',
	helpersname: '$',
	tags: {
		'@\\{': compile_code,
		'@if\\s*\\(': compile_if,
		'@while\\s*\\(': compile_while,
		'@for\\s*\\(': compile_for,
		'@function\\s+[$A-Za-z0-9]*\\s*\\(': compile_function,
		'@section\\s+[$A-Za-z0-9]*\\s*\\{': compile_section
	},
	inline: {
		'(@section\\()([^]*?)(\\)@)': output_section,
		'(@layout\\()([^]*?)(\\)@)': compile_layout,
		'(@partial\\()([^]*?)(\\)@)': compile_partial,
		'(@\\()([^]*?)(\\)@)': output_as_text,
		'(@!\\()([^]*?)(\\)@)': output_as_html
	},
	helpers: {
		encode: encode_html,
		json: json_stringify,
		join: join_helper,
		upper: uppercase_helper,
		lower: lowercase_helper
	}
};

function compile_code(inside, ctx, callback) {

	callback(null, inside.value.trim());
}

function compile_for(inside, ctx, callback) {

	var code = 'for(' + inside.value + '}';

	var blocks = match_recursive(code, /\{/g, /\}/g);

	var out = '';

	out += blocks[0].value;
	out += '{';

	this.compile(blocks[1].value, ctx, function (err, res) {

		if (err) {
			return callback(err);
		}

		out += res;
		out += '}';

		callback(null, out);
	});
}

function compile_function(inside, ctx, callback) {

	var left = inside.left.value.trim().substring(1);

	callback(null, left + inside.value.trim() + '}');
}

function compile_if(inside, ctx, callback) {
	var _this4 = this;

	var code = 'if(' + inside.value + '}';

	var blocks = match_recursive(code, /\{/g, /\}/g);

	loop_async(blocks, function (block, i, array, callback) {

		if (block.name == VALUE_NAME_OUTSIDE) {
			return callback(null, block.value);
		}

		_this4.compile(block.value, ctx, callback);
	}, function (err, results) {
		if (err) {
			return callback(err);
		}
		callback(null, results.join(''));
	});
}

function output_as_text(inside, ctx, callback) {

	try {
		var val = inside.value.trim();

		if (val === '') {
			callback();
		}

		callback(null, 'this.output += this.helpers.encode(' + inside.value.trim() + ');');
	} catch (e) {
		callback(e);
	}
}

function output_as_html(inside, ctx, callback) {

	try {
		var val = inside.value.trim();

		if (val === '') {
			callback();
		}

		callback(null, 'this.output += (' + inside.value.trim() + ');');
	} catch (e) {
		callback(e);
	}
}

function compile_layout(inside, ctx, callback) {

	try {
		if (ctx.__layout) {
			return callback();
		}

		Atat.compileUri(escape_quotes(inside.value), ctx.options, function (err, template) {

			if (err) {

				return callback(err);
			}

			ctx.__layout = template;
			template.__context.parent = ctx;

			callback();
		});
	} catch (e) {
		callback(e);
	}
}

function compile_partial(inside, ctx, callback) {

	try {
		var value = inside.value.trim();

		if (value == '') {
			return callback(new Error('Partial parsing error'));
		}

		var args = value.split(/\s*,\s*/g);

		var uri = escape_quotes(args.shift());

		Atat.compileUri(uri, ctx.options, function (err, template) {

			if (err) {

				return callback(err);
			}

			ctx.__partials.push(template);
			template.__context.parent = ctx;

			var output = 'this.output += this.__partials[' + (ctx.__partials.length - 1) + '](' + args + ');';

			callback(null, output);
		});
	} catch (e) {
		callback(e);
	}
}

function output_section(inside, ctx, callback) {

	try {
		var name = escape_quotes(inside.value);

		var output = 'this.output += (function(){var s = this.section(\'' + name + '\'); return s?s(' + ctx.arguments + '):"";}).call(this);';

		callback(null, output);
	} catch (e) {
		callback(e);
	}
}

function output_call_helper(inside, ctx, callback) {

	try {
		var name = inside.left.value.substring(1, inside.left.value.length - 1);

		if (typeof ctx.helpers[name] !== 'function') {
			throw 'Helper "' + name + '" didn\'t declarated';
		}

		callback(null, 'this.output += this.helpers.' + name + '(' + inside.value.trim() + ');');
	} catch (e) {
		callback(e);
	}
}

function compile_section(inside, ctx, callback) {

	var block = inside.value.trim();

	var value = inside.left.value.trim();
	var reg_name = /^@section\s+([A-Za-z0-9]+)\s*\{/g;
	var match = regexp_exec(value, reg_name);

	if (!match || match.length > 2) {
		return callback(new Error('Section parsing error'));
	}

	var name = match[1].trim();

	if (ctx.__sections[name]) {
		return callback(new Error('Section already exists'));
	}

	Atat.compile(block, ctx.options, function (err, template) {

		if (err) {

			return callback(err);
		}

		template.__context.parent = ctx;
		ctx.__sections[name] = template;

		callback(null);
	});
}

function compile_while(inside, ctx, callback) {

	var code = 'while(' + inside.value + '}';

	var blocks = match_recursive(code, /\{/g, /\}/g);

	var out = '';

	out += blocks[0].value;
	out += '{';

	this.compile(blocks[1].value, ctx, function (err, res) {

		if (err) {
			return callback(err);
		}

		out += res;
		out += '}';

		callback(null, out);
	});
}

Atat.__express = function (path, options, callback) {

	Atat.compileUri(path, function (err, template) {

		if (err) {
			return callback(err.toString());
		}

		return callback(null, template(options));
	});
};

var fs = require('fs');

function fileLoader(path, callback) {
	fs.readFile(path, 'utf-8', callback);
}

var VALUE_NAME_OUTSIDE = 'outside',
    VALUE_NAME_INSIDE = 'inside',
    HTML_RULES = {
	'&': '&#38;',
	'<': '&#60;',
	'>': '&#62;',
	'"': '&#34;',
	"'": '&#39;',
	'/': '&#47;'
},
    CLEAR_TAGS = /[-[\](){}*+?.,\\^$|#\s]/g,
    MATCH_HTML = /&(?!#?\w+;)|<|>|"|'|\//g;

function get_tags(compilers) {

	var regexps = [];

	loop(compilers, function (compiler, regexp) {

		if (regexps.indexOf(regexp) === -1) {
			regexps.push(regexp);
		}
	});

	return {
		open: new RegExp(regexps.join('|'), 'g'),
		close: /}@/g
	};
}

function get_tags_inline(compilers) {

	var regexps = [];

	loop(compilers, function (compiler, regexp) {
		regexps.push(regexp);
	});

	regexps.push('(@[A-Za-z0-9$]+\\()([^]*?)(\\)@)');

	return new RegExp(regexps.join('|'), 'g');
}

function encode_html() {
	var code = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

	return code.toString().replace(MATCH_HTML, function (m) {
		return HTML_RULES[m] || m;
	});
}

function loop(array, fn) {

	if (Object.prototype.toString.call(array) !== '[object Array]') {
		for (var x in array) {
			if (array.hasOwnProperty(x)) {
				fn(array[x], x, array);
			}
		}
		return;
	}

	for (var i = 0, l = array.length; i < l; i++) {
		fn(array[i], i, array);
	}
}

function loop_async(array, fn, callback) {

	var ready = 0,
	    finished = false,
	    results = [],
	    length = array.length;

	for (var i = 0; i < length; i++) {
		fn(array[i], i, array, cb(i));
	}

	function cb(index) {
		return function (err, res) {

			if (finished) {
				return;
			}

			if (err) {
				finished = true;
				callback(err);
				return;
			}

			results[index] = res;
			ready++;

			if (ready == length) {
				finished = true;
				callback(null, results);
			}
		};
	}
}

function merge(src) {
	var dest = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	for (var x in src) {
		if (!dest.hasOwnProperty(x) && src.hasOwnProperty(x)) {
			if (_typeof(src[x]) == 'object') {
				dest[x] = merge(src[x]);
			} else {
				dest[x] = src[x];
			}
		}
	}

	return dest;
}

function trim_string(str) {
	for (var _len = arguments.length, chars = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
		chars[_key - 1] = arguments[_key];
	}

	if (chars.length == 0) {
		return String.prototype.trim.call(str);
	}

	while (chars.indexOf(str.charAt(0)) >= 0) {
		str = str.substring(1);
	}

	while (chars.indexOf(str.charAt(string.length - 1)) >= 0) {
		str = str.substring(0, str.length - 1);
	}

	return str;
}

function escape_quotes(str) {
	return trim_string(str).replace(/^"(.*)"$/g, '$1').replace(/^'(.*)'$/g, '$1');
}

function json_stringify(obj) {
	return JSON.stringify(obj);
}

function join_helper() {
	var array = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
	var separator = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

	return Array.prototype.join.call(array, separator);
}

function uppercase_helper() {
	var str = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

	return str.toString().toUpperCase();
}

function lowercase_helper() {
	var str = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

	return str.toString().toLowerCase();
}

function match_recursive(str, left, right) {

	var global = left.global,
	    sticky = left.sticky,
	    output = [],
	    openTokens = 0,
	    delimStart = 0,
	    delimEnd = 0,
	    lastOuterEnd = 0,
	    outerStart = void 0,
	    innerStart = void 0,
	    leftMatch = void 0,
	    rightMatch = void 0;

	while (true) {

		leftMatch = regexp_exec(str, left, delimEnd);
		rightMatch = regexp_exec(str, right, delimEnd);

		// Keep the leftmost match only
		if (leftMatch && rightMatch) {
			if (leftMatch.index <= rightMatch.index) {
				rightMatch = null;
			} else {
				leftMatch = null;
			}
		}

		// Paths (LM: leftMatch, RM: rightMatch, OT: openTokens):
		// LM | RM | OT | Result
		// 1  | 0  | 1  | loop
		// 1  | 0  | 0  | loop
		// 0  | 1  | 1  | loop
		// 0  | 1  | 0  | throw
		// 0  | 0  | 1  | throw
		// 0  | 0  | 0  | break
		// The paths above don't include the sticky mode special case. The loop ends after the
		// first completed match if not `global`.
		if (leftMatch || rightMatch) {

			delimStart = (leftMatch || rightMatch).index;

			delimEnd = delimStart + (leftMatch || rightMatch)[0].length;
		} else if (!openTokens) {
			break;
		}

		if (sticky && !openTokens && delimStart > lastOuterEnd) {
			break;
		}

		if (leftMatch) {

			if (!openTokens) {

				outerStart = delimStart;
				innerStart = delimEnd;
			}

			++openTokens;
		} else if (rightMatch && openTokens) {

			if (! --openTokens) {

				if (outerStart > lastOuterEnd) {

					output.push({
						name: VALUE_NAME_OUTSIDE,
						value: str.slice(lastOuterEnd, outerStart),
						start: lastOuterEnd,
						end: outerStart
					});
				}

				output.push({
					name: VALUE_NAME_INSIDE,
					value: str.slice(innerStart, delimStart),
					start: innerStart,
					end: delimStart,
					left: {
						value: str.slice(outerStart, innerStart),
						start: outerStart,
						end: innerStart
					},
					right: {
						value: str.slice(delimStart, delimEnd),
						start: delimStart,
						end: delimEnd
					}
				});

				lastOuterEnd = delimEnd;

				if (!global) {
					break;
				}
			}
		} else {
			throw new Error('Unbalanced delimiter found in string');
		}

		// If the delimiter matched an empty string, avoid an infinite loop
		if (delimStart === delimEnd) {
			++delimEnd;
		}
	}

	if (global && str.length > lastOuterEnd) {

		output.push({
			name: VALUE_NAME_OUTSIDE,
			value: str.slice(lastOuterEnd),
			start: lastOuterEnd,
			end: str.length
		});
	}

	return output;
}

function regexp_test(str, regexp) {
	var pos = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;


	regexp.lastIndex = pos;

	var test = regexp.test(str);

	if (regexp.global) {

		regexp.lastIndex = test ? regexp.lastIndex : 0;
	}

	return test;
}

function regexp_exec(str, regexp) {
	var pos = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;


	regexp.lastIndex = pos;

	var match = regexp.exec(str);

	if (regexp.global) {

		regexp.lastIndex = match ? regexp.lastIndex : 0;
	}

	return match;
}

function clean_array(array) {
	for (var i = 0; i < array.length; i++) {
		if (typeof array[i] === 'undefined') {
			array.splice(i, 1);
			i--;
		}
	}
}

function match_inline(str, regexp) {

	var global = regexp.global,
	    sticky = regexp.sticky,
	    output = [],
	    lastEnd = 0,
	    leftStart = 0,
	    innerStart = void 0,
	    innerEnd = void 0;

	while (true) {

		var match = regexp_exec(str, regexp, lastEnd);

		if (match == null) {
			break;
		}

		leftStart = match.index;

		if (sticky && leftStart > lastEnd) {
			break;
		}

		clean_array(match);

		innerStart = leftStart + match[1].length;
		innerEnd = lastEnd + innerStart + match[2].length;

		if (leftStart > lastEnd) {
			output.push({
				name: VALUE_NAME_OUTSIDE,
				value: str.slice(lastEnd, leftStart),
				start: lastEnd,
				end: leftStart
			});
		}

		output.push({
			name: VALUE_NAME_INSIDE,
			value: match[2],
			start: innerStart,
			end: innerEnd,
			left: {
				value: match[1],
				start: leftStart,
				end: innerStart
			},
			right: {
				value: match[3],
				start: innerEnd,
				end: innerEnd + match[3].length
			}
		});

		lastEnd = leftStart + match[0].length;

		if (!global) {
			break;
		}
	}

	if (global && str.length > lastEnd) {

		output.push({
			name: VALUE_NAME_OUTSIDE,
			value: str.slice(lastEnd),
			start: lastEnd,
			end: str.length
		});
	}

	return output;
}

var root = (function() { return this || (0, eval)("this"); }());
if(typeof root !== "undefined"){var previous_atat = root.Atat; Atat.noConflict = function(){ root.Atat = previous_atat; return Atat; }}
if(typeof module !== "undefined" && module.exports){ module.exports = Atat; }else if(typeof define === "function" && define.amd){ define(function() { return Atat; }); }else{ root.Atat = Atat; }
}());