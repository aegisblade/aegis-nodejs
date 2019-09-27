// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

var VERSION = require('../package.json').version;
console.log(VERSION);
exports.handlers = {
  jsdocCommentFound: function(e) {
    e.comment = e.comment.replace(/{@pkg version}/g, VERSION);
  }
};
