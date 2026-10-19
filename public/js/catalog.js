import {
  getPapers,
  getPaperFields,
  createPaper,
  updatePaper,
  deletePaper,
} from "./api.js";
import { paperCard } from "./components/paper-card.js";
import { el, clear, setStatus } from "./dom.js";

const searchForm = document.getElementById("search-form");
const searchError = document.getElementById("search-error");
const fieldSelect = document.getElementById("field");
const clearButton = document.getElementById("clear-search");

const paperPanel = document.getElementById("paper-panel");
const paperForm = document.getElementById("paper-form");
const submitButton = document.getElementById("submit-button");
const formError = document.getElementById("form-error");
const paperIdField = document.getElementById("paper-id");
const cancelButton = document.getElementById("cancel-edit");
const formHeading = document.getElementById("form-heading");

const statusLine = document.getElementById("status");
const resultsList = document.getElementById("results");
const pager = document.getElementById("pager");
const pageLabel = document.getElementById("page-label");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");

const LIMIT = 24;
const state = { q: "", field: "", yearFrom: "", yearTo: "", page: 1, totalPages: 1 };

function showError(node, message) {
  node.textContent = message;
  node.hidden = false;
}

function hideError(node) {
  node.hidden = true;
  node.textContent = "";
}

async function loadFields() {
  try {
    const payload = await getPaperFields();

    payload.fields.forEach((entry) => {
      const option = el("option", "", entry.name + " (" + entry.count + ")");
      option.value = entry.name;
      fieldSelect.appendChild(option);
    });
  } catch {
    // The dropdown is a convenience. Search still works without it.
  }
}

function renderEmpty() {
  const empty = el("li", "empty");
  empty.appendChild(
    el("p", "", "No papers match those filters. Try fewer words or a wider year range.")
  );
  resultsList.appendChild(empty);
}

async function load() {
  setStatus(statusLine, "Loading the catalog...");

  try {
    const payload = await getPapers({
      q: state.q,
      field: state.field,
      yearFrom: state.yearFrom,
      yearTo: state.yearTo,
      page: state.page,
      limit: LIMIT,
    });

    const { items, total, limit } = payload;
    state.totalPages = Math.max(1, Math.ceil(total / limit));
    // Deleting the only card on the last page leaves that page empty. Step back.
    if (items.length === 0 && total > 0 && state.page > state.totalPages) {
      state.page = state.totalPages;
      await load();
      return;
    }

    clear(resultsList);

    if (items.length === 0) {
      renderEmpty();
      pager.hidden = true;
      setStatus(statusLine, "0 papers found.");
      return;
    }

    items.forEach((paper) =>
      resultsList.appendChild(paperCard(paper, { onEdit: startEdit, onDelete: remove }))
    );

    const first = (state.page - 1) * limit + 1;
    const last = first + items.length - 1;
    setStatus(
      statusLine,
      "Showing " + first + " to " + last + " of " + total.toLocaleString() + " papers."
    );

    pager.hidden = state.totalPages <= 1;
    pageLabel.textContent = "Page " + state.page + " of " + state.totalPages;
    prevButton.disabled = state.page <= 1;
    nextButton.disabled = state.page >= state.totalPages;
  } catch (error) {
    clear(resultsList);
    pager.hidden = true;
    setStatus(statusLine, "Could not load the catalog. " + error.message, true);
  }
}

function onSearch(event) {
  event.preventDefault();
  hideError(searchError);

  const data = new FormData(searchForm);
  const yearFrom = String(data.get("yearFrom") || "").trim();
  const yearTo = String(data.get("yearTo") || "").trim();

  if (yearFrom && yearTo && Number(yearFrom) > Number(yearTo)) {
    showError(searchError, "From year cannot be after to year.");
    return;
  }

  state.q = String(data.get("q") || "").trim();
  state.field = String(data.get("field") || "");
  state.yearFrom = yearFrom;
  state.yearTo = yearTo;
  state.page = 1;
  load();
}

function onClear() {
  searchForm.reset();
  hideError(searchError);
  Object.assign(state, { q: "", field: "", yearFrom: "", yearTo: "", page: 1 });
  load();
}

function readPaperForm() {
  const data = new FormData(paperForm);
  const paper = {
    title: String(data.get("title") || "").trim(),
    authors: String(data.get("authors") || "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
    venue: String(data.get("venue") || "").trim(),
    doi: String(data.get("doi") || "").trim(),
    abstract: String(data.get("abstract") || "").trim(),
  };

  const year = String(data.get("year") || "").trim();
  if (year) {
    paper.year = Number(year);
  }

  return paper;
}

function resetPaperForm() {
  paperForm.reset();
  paperIdField.value = "";
  formHeading.textContent = "Add a paper";
  submitButton.textContent = "Add paper";
  cancelButton.hidden = true;
  hideError(formError);
}

function startEdit(paper) {
  paperIdField.value = paper._id;
  paperForm.elements.title.value = paper.title || "";
  paperForm.elements.authors.value = Array.isArray(paper.authors)
    ? paper.authors.join(", ")
    : "";
  paperForm.elements.venue.value = paper.venue || "";
  paperForm.elements.year.value = paper.year || "";
  paperForm.elements.doi.value = paper.doi || "";
  paperForm.elements.abstract.value = paper.abstract || "";

  formHeading.textContent = "Edit paper";
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  hideError(formError);

  paperPanel.open = true;
  paperPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  paperForm.elements.title.focus();
}

async function remove(paper) {
  if (!window.confirm('Delete "' + paper.title + '" from the catalog for everyone?')) {
    return;
  }

  try {
    await deletePaper(paper._id);

    if (paperIdField.value === paper._id) {
      resetPaperForm();
    }

    await load();
  } catch (error) {
    setStatus(statusLine, "Could not delete that paper. " + error.message, true);
  }
}

async function onSavePaper(event) {
  event.preventDefault();
  hideError(formError);

  const paper = readPaperForm();

  if (!paper.title) {
    showError(formError, "Title is required.");
    return;
  }

  const editingId = paperIdField.value;
  submitButton.disabled = true;

  try {
    if (editingId) {
      await updatePaper(editingId, paper);
      resetPaperForm();
      paperPanel.open = false;
      // Reload with the current search, field, years and page unchanged.
      await load();
    } else {
      await createPaper(paper);
      resetPaperForm();
      paperPanel.open = false;

      // New papers have 0 citations, so they would sit on the last page of the
      // default sort. Search for the title so the person sees it immediately.
      searchForm.reset();
      searchForm.elements.q.value = paper.title;
      Object.assign(state, {
        q: paper.title,
        field: "",
        yearFrom: "",
        yearTo: "",
        page: 1,
      });
      await load();
    }
  } catch (error) {
    showError(formError, error.message);
  } finally {
    submitButton.disabled = false;
  }
}

searchForm.addEventListener("submit", onSearch);
clearButton.addEventListener("click", onClear);
paperForm.addEventListener("submit", onSavePaper);
cancelButton.addEventListener("click", resetPaperForm);

prevButton.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    load();
  }
});

nextButton.addEventListener("click", () => {
  if (state.page < state.totalPages) {
    state.page += 1;
    load();
  }
});

loadFields();
load();
