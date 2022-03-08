'use strict';

/* eslint-disable */

function createElement(tagName, id, className) {
  const el = document.createElement(tagName);
  el.id = id;
  if (className) el.className = className;
  document.body.append(el);
  return el;
}
