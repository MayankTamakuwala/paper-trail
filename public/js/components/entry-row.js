import { el } from "../dom.js";

const STATUS_LABEL = {
  "to-read": "To read",
  reading: "Reading",
  read: "Read",
};

const NEXT_STATUS = {
  "to-read": "reading",
  reading: "read",
  read: "to-read",
};

export function entryRow(entry, { onEdit, onDelete, onAdvance }) {
  const item = el("li", "entry");
  item.dataset.priority = entry.priority || "medium";

  const head = el("div", "entry__head");
  head.appendChild(el("h3", "entry__title", entry.title));

  const badge = el("span", "entry__badge", STATUS_LABEL[entry.status] || entry.status);
  badge.dataset.status = entry.status;
  head.appendChild(badge);
  item.appendChild(head);

  const details = [entry.authors, entry.year, entry.venue].filter(Boolean);
  if (details.length > 0) {
    item.appendChild(el("p", "entry__meta", details.join(" · ")));
  }

  if (entry.note) {
    item.appendChild(el("p", "entry__note", entry.note));
  }

  if (Array.isArray(entry.tags) && entry.tags.length > 0) {
    const tags = el("ul", "entry__tags");
    entry.tags.forEach((tag) => tags.appendChild(el("li", "entry__tag", tag)));
    item.appendChild(tags);
  }

  const actions = el("div", "entry__actions");

  const nextStatus = NEXT_STATUS[entry.status];
  const advance = el("button", "button", "Mark as " + STATUS_LABEL[nextStatus]);
  advance.type = "button";
  advance.addEventListener("click", () => onAdvance(entry, nextStatus));
  actions.appendChild(advance);

  const edit = el("button", "button", "Edit");
  edit.type = "button";
  edit.addEventListener("click", () => onEdit(entry));
  actions.appendChild(edit);

  const remove = el("button", "button button--danger", "Delete");
  remove.type = "button";
  remove.addEventListener("click", () => onDelete(entry));
  actions.appendChild(remove);

  item.appendChild(actions);
  return item;
}
