'use strict';

describe("If block", function() {

	var template = "";

	beforeEach(function() {
		template = "";
	});

	it("Simple expretion TRUE", function(done) {

		template = "@if ( true ) {Hello}@ world!";

		Atat.compile(template, function(err, tmpl) {

			expect(tmpl()).to.eql("Hello world!");

			done();
		});
	});

	it("Simple expretion FALSE", function(done) {

		template = "@if ( false ) {Hello}@ world!";

		Atat.compile(template, function(err, tmpl) {

			expect(tmpl()).to.eql(" world!");

			done();
		});
	});

	it("Model expretion TRUE", function(done) {

		template = "@if ( it.show ) {Hello}@ world!";

		Atat.compile(template, function(err, tmpl) {

			expect(tmpl({ show: true })).to.eql("Hello world!");

			done();
		});
	});

	it("Model expretion TRUE", function(done) {

		template = "@if ( it.show ) {Hello}@ world!";

		Atat.compile(template, function(err, tmpl) {

			expect(tmpl({ show: false })).to.eql(" world!");

			done();
		});
	});

});
