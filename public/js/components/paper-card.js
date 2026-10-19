import { el } from "../dom.js";

const ABSTRACT_LIMIT = 240;

function shortAuthors(authors) {
  if (!Array.isArray(authors) || authors.length === 0) {
    return "";
  }

  if (authors.length <= 3) {
    return authors.join(", ");
  }

  return authors.slice(0, 3).join(", ") + " et al";
}

function shortAbstract(text) {
  if (!text || text.length <= ABSTRACT_LIMIT) {
    return text || "";
  }

  return text.slice(0, ABSTRACT_LIMIT).trimEnd() + "...";
}

export function paperCard(paper, { onEdit, onDelete } = {}) {
  const card = el("li", "paper-card");

  card.appendChild(el("h3", "paper-card__title", paper.title));

  const meta = [shortAuthors(paper.authors), paper.year, paper.venue].filter(Boolean);
  if (meta.length > 0) {
    card.appendChild(el("p", "paper-card__meta", meta.join(" · ")));
  }

  if (paper.abstract) {
    card.appendChild(el("p", "paper-card__abstract", shortAbstract(paper.abstract)));
  }

  const footer = el("div", "paper-card__footer");

  if (paper.source === "user") {
    footer.appendChild(el("span", "paper-card__badge", "Added by hand"));
  } else if (Array.isArray(paper.fields) && paper.fields.length > 1) {
    footer.appendChild(el("span", "paper-card__badge", paper.fields[1]));
  }

  footer.appendChild(
    el(
      "span",
      "paper-card__meta",
      (paper.citationCount || 0).toLocaleString() + " citations"
    )
  );

  if (paper.doi) {
    const link = el("a", "", "Link");
    link.href = paper.doi;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    footer.appendChild(link);
  }

  card.appendChild(footer);

  if (onEdit || onDelete) {
    const actions = el("div", "paper-card__actions");

    if (onEdit) {
      const edit = el("button", "button", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => onEdit(paper));
      actions.appendChild(edit);
    }

    if (onDelete) {
      const remove = el("button", "button button--danger", "Delete");
      remove.type = "button";
      remove.addEventListener("click", () => onDelete(paper));
      actions.appendChild(remove);
    }

    card.appendChild(actions);
  }

  return card;
}
