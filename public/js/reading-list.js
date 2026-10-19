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

const SAMPLES = [
  {
    title: "Attention Is All You Need",
    authors: "Ashish Vaswani, Noam Shazeer, Niki Parmar",
    year: 2017,
    venue: "NeurIPS",
    status: "to-read",
    priority: "high",
    tags: "transformers, nlp",
    note: "Might make section 3.2 unnecessary. Check before rewriting that part.",
  },
  {
    title: "Deep Residual Learning for Image Recognition",
    authors: "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun",
    year: 2016,
    venue: "CVPR",
    status: "reading",
    priority: "medium",
    tags: "cv, resnet",
    note: "Need the exact degradation argument for the introduction.",
  },
  {
    title: "Language Models are Few-Shot Learners",
    authors: "Tom Brown, Benjamin Mann, Nick Ryder",
    year: 2020,
    venue: "NeurIPS",
    status: "read",
    priority: "low",
    tags: "llm, scaling",
    note: "Cite for the scaling curve only. The evaluation section is weaker than I remembered.",
  },
  {
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: "Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova",
    year: 2019,
    venue: "NAACL",
    status: "to-read",
    priority: "medium",
    tags: "nlp, pretraining",
    note: "Background for the related work section. Skim the ablations.",
  },
];

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

async function loadSamples(button) {
  button.disabled = true;
  button.textContent = "Adding...";

  try {
    for (const sample of SAMPLES) {
      await createEntry(sample);
    }
    await load();
  } catch (error) {
    button.disabled = false;
    button.textContent = "Load a few samples";
    setStatus(statusLine, "Could not add the samples. " + error.message, true);
  }
}

function renderEmpty() {
  const empty = el("li", "empty");

  if (state.status) {
    empty.appendChild(el("p", "", "Nothing in this status yet."));
    entriesList.appendChild(empty);
    return;
  }

  empty.appendChild(
    el("p", "", "Your list is empty. Add a paper using the form above to get started.")
  );

  const hint = el("p", "empty__hint", "Or load a few samples to see how the list works.");
  empty.appendChild(hint);

  const button = el("button", "button button--primary", "Load a few samples");
  button.type = "button";
  button.addEventListener("click", () => loadSamples(button));
  empty.appendChild(button);

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
