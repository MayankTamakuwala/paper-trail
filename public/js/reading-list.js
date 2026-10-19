import { getEntries, createEntry, updateEntry, deleteEntry } from "./api.js";
import { entryRow } from "./components/entry-row.js";
import { el, clear, setStatus } from "./dom.js";

const form = document.getElementById("entry-form");
const idField = document.getElementById("entry-id");
const submitButton = document.getElementById("submit-button");
const cancelButton = document.getElementById("cancel-edit");
const formHeading = document.getElementById("form-heading");
const formError = document.getElementById("form-error");
const entriesList = document.getElementById("entries");
const statusLine = document.getElementById("status");
const sortSelect = document.getElementById("sort");
const filterButtons = Array.from(document.querySelectorAll(".chip"));

const state = { status: "", sort: "newest", counts: null };

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function hideError() {
  formError.hidden = true;
  formError.textContent = "";
}

function resetForm() {
  form.reset();
  idField.value = "";
  formHeading.textContent = "Add a paper";
  submitButton.textContent = "Add to list";
  cancelButton.hidden = true;
  hideError();
}

function fillForm(entry) {
  idField.value = entry._id;
  form.title.value = entry.title || "";
  form.authors.value = Array.isArray(entry.authors) ? entry.authors.join(", ") : "";
  form.year.value = entry.year || "";
  form.venue.value = entry.venue || "";
  form.status.value = entry.status || "to-read";
  form.priority.value = entry.priority || "medium";
  form.tags.value = Array.isArray(entry.tags) ? entry.tags.join(", ") : "";
  form.note.value = entry.note || "";

  formHeading.textContent = "Edit paper";
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  hideError();

  form.scrollIntoView({ behavior: "smooth", block: "start" });
  form.title.focus();
}

function summary() {
  if (!state.counts) {
    return "";
  }

  const { counts } = state;
  const total = counts["to-read"] + counts.reading + counts.read;

  return (
    total +
    " saved. " +
    counts["to-read"] +
    " to read, " +
    counts.reading +
    " reading, " +
    counts.read +
    " read."
  );
}

function renderEmpty() {
  const empty = el("li", "empty");
  const message = state.status
    ? "Nothing in this status yet."
    : "Your list is empty. Add the first paper using the form above.";
  empty.appendChild(el("p", "", message));
  entriesList.appendChild(empty);
}

async function load() {
  setStatus(statusLine, "Loading your list...");

  try {
    const payload = await getEntries({ status: state.status, sort: state.sort });
    state.counts = payload.counts;
    clear(entriesList);

    if (payload.items.length === 0) {
      renderEmpty();
    } else {
      payload.items.forEach((entry) => {
        entriesList.appendChild(
          entryRow(entry, { onEdit: fillForm, onDelete: remove, onAdvance: advance })
        );
      });
    }

    setStatus(statusLine, summary());
  } catch (error) {
    clear(entriesList);
    setStatus(statusLine, "Could not load your list. " + error.message, true);
  }
}

async function remove(entry) {
  if (!window.confirm("Remove " + entry.title + " from your list?")) {
    return;
  }

  try {
    await deleteEntry(entry._id);

    if (idField.value === entry._id) {
      resetForm();
    }

    await load();
  } catch (error) {
    setStatus(statusLine, "Could not delete that entry. " + error.message, true);
  }
}

async function advance(entry, nextStatus) {
  try {
    await updateEntry(entry._id, { status: nextStatus });
    await load();
  } catch (error) {
    setStatus(statusLine, "Could not update that entry. " + error.message, true);
  }
}

async function submit(event) {
  event.preventDefault();
  hideError();

  const data = new FormData(form);
  const payload = {
    title: data.get("title"),
    authors: data.get("authors"),
    year: data.get("year"),
    venue: data.get("venue"),
    status: data.get("status"),
    priority: data.get("priority"),
    tags: data.get("tags"),
    note: data.get("note"),
  };

  submitButton.disabled = true;

  try {
    if (idField.value) {
      await updateEntry(idField.value, payload);
    } else {
      await createEntry(payload);
    }

    resetForm();
    await load();
  } catch (error) {
    showError(error.message);
  } finally {
    submitButton.disabled = false;
  }
}

form.addEventListener("submit", submit);
cancelButton.addEventListener("click", resetForm);

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  load();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((other) => other.setAttribute("aria-pressed", "false"));
    button.setAttribute("aria-pressed", "true");
    state.status = button.dataset.status || "";
    load();
  });
});

load();
