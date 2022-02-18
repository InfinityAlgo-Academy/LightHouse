'use strict';

function createElement(tagName, id, className) {
  const el = document.createElement(tagName);
  el.id = id;
  el.className = className;
  document.body.append(el);
  return el;
}
