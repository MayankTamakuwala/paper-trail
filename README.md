# Paper Trail

A reading queue for the research papers you meant to read.

**Live app:** https://paper-trail-mu.vercel.app

## Authors

Mayank Tamakuwala and Varshith Sai Pothula

Built for [CS 5610 Web Development](https://northeastern.instructure.com/courses/261032),
Khoury College, Northeastern University, Fall 2026.

## Objective

Finding papers is a solved problem. Scholar, arXiv and a dozen other tools will hand you
more relevant work than you can read in a decade. What nobody solves is the part after
that, when forty tabs are open, the downloads folder is full of files called
`2310.08419v2.pdf`, and you cannot remember why any of them seemed important.

Paper Trail is built around the one field every other tool throws away: a note explaining
why you saved something. Everything else exists to support it. Papers move through to read,
reading and read, the counts sit above the list so the backlog is impossible to ignore, and
a catalog of 1,200 real papers seeded from OpenAlex means you can find something without
leaving the app.

It is also a course project, so under the hood it is a demonstration of Node, Express and
the MongoDB driver with a client side rendered frontend written in plain JavaScript. No
React, no Mongoose, no template engines, no build step.

## Screenshots

The reading list, with saved papers at different priorities and statuses. The coloured
stripe down the left of each entry encodes priority, the pill on the right shows status.

![The reading list with four saved papers](docs/screenshot.png)

The catalog, searching across 1,000 seeded papers.

![The paper catalog with search filters and result cards](docs/screenshot-catalog.png)

## What it does

There are two pages.

**My reading list** (`/list.html`) is the personal queue. Add a paper by typing its title
and whatever else you know about it, set a priority, and write down why you saved it. From
there you can move entries between statuses, filter to one status, sort by priority or
title or date added, edit anything in place, and delete what you no longer need. If your
list is empty there is a button to load a few sample papers, which is the fastest way to
see how the thing behaves before committing to typing anything in.

Lists are scoped per browser. The app has no login, so each visitor gets an anonymous id
stored in `localStorage` and only ever sees their own entries. That is what stops a shared
deployment turning into one global list that everyone edits at once.

**Catalog** (`/index.html`) is the shared paper database. Search by title, author or venue,
filter by field and year, and page through results sorted by citation count so foundational
work surfaces first. Each result has an "Add to reading list" button, which copies the
paper straight into your queue without retyping it. You can also add papers the catalog is
missing through a dialog, correct metadata that came through wrong, and delete duplicates.

The two collections stay independent. A reading list entry stores its own copy of the paper
details rather than pointing at a catalog record, so neither page breaks if the other
collection is empty, and nothing has to be joined at read time.

## Running it locally

You need Node 20 or newer and a MongoDB database. A free Atlas M0 cluster is fine.

```bash
git clone https://github.com/MayankTamakuwala/paper-trail.git
cd paper-trail
npm install
cp .env.example .env
```

Open `.env` and set `MONGODB_URI` to your connection string. If you are using Atlas, go to
Network Access and allow `0.0.0.0/0`, otherwise your own IP will be blocked.

Then load the catalog and start the server:

```bash
npm run seed    # pulls 1,200 papers from OpenAlex, takes about 20 seconds
npm run dev     # http://localhost:3000
```

The seed step needs no API key. OpenAlex is open, and the script uses offset paging, which
works without one. It will not go past 10,000 papers, because that is where OpenAlex starts
requiring a key for cursor paging, but 1,200 is the default and plenty.

### Other scripts

| Command                | What it does                           |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | Local server on port 3000              |
| `npm run seed`         | Fetch papers and populate the database |
| `npm run lint`         | ESLint across the project              |
| `npm run format`       | Format everything with Prettier        |
| `npm run format:check` | Check formatting without writing       |

### If the seed or the server cannot reach Mongo

Atlas hands you two connection strings, and on some networks only one of them works.

The default looks like `mongodb+srv://...`. The `+srv` part means the driver has to make a
DNS SRV lookup to discover the cluster hosts, and plenty of networks, campus Wi-Fi and VPNs
especially, only forward ordinary A records. When that lookup is refused you get:

```
Error: querySrv ECONNREFUSED _mongodb._tcp.your-cluster.mongodb.net
```

That is your DNS resolver, not the cluster and not your credentials. Two ways out.

**Use the legacy connection string.** In Atlas, go to Connect, then Drivers, then pick an
older Node.js version from the driver version dropdown. You get a string that names the
shard hosts directly, so no SRV lookup happens at all:

```
mongodb://USER:PASSWORD@cluster-shard-00-00.xxxxx.mongodb.net:27017,cluster-shard-00-01.xxxxx.mongodb.net:27017,cluster-shard-00-02.xxxxx.mongodb.net:27017/?ssl=true&replicaSet=atlas-xxxxxx-shard-0&authSource=admin
```

Drop that into `MONGODB_URI` and it works on networks where the `+srv` form does not. The
tradeoff is that the hostnames are pinned, so if Atlas ever moves the cluster you have to
fetch a fresh string.

**Or fix DNS on your machine**, by pointing your system resolver at `1.1.1.1` or `8.8.8.8`.
That fixes every `+srv` connection, not just this project.

We deliberately did not put a DNS workaround in the code. Calling `dns.setServers()` inside
the app would override the resolver in every environment, including production, to work
around one machine's network.

## Project layout

```
api/index.js              Vercel entry point, re-exports the Express app
server/
  app.js                  Express setup, static files, error handling
  validate.js             Request validation and type checking
  db/client.js            Cached MongoClient, reused across serverless invocations
  db/papers.js            Queries for the papers collection
  db/readingList.js       Queries for the readingList collection
  routes/papers.js        CRUD endpoints for papers
  routes/readingList.js   CRUD endpoints for reading list entries
scripts/seed.js           Pulls papers from OpenAlex into Mongo
public/
  index.html              Catalog page
  list.html               Reading list page
  css/                    One stylesheet per page, plus one per component
  js/api.js               Every fetch call in the app lives here
  js/catalog.js           Catalog page controller
  js/reading-list.js      Reading list page controller
  js/components/          Functions that build DOM nodes
docs/                     Design document and screenshot
wireframe/                Wireframes the design document is based on
```

## API

Everything under `/api` returns JSON. Reading list routes require an `x-user-id` header,
which the frontend generates once and keeps in `localStorage`.

| Method | Route                     | Purpose                                                         |
| ------ | ------------------------- | --------------------------------------------------------------- |
| GET    | `/api/papers`             | Search with `q`, `field`, `yearFrom`, `yearTo`, `page`, `limit` |
| GET    | `/api/papers/meta/fields` | Field names and counts, used by the filter dropdown             |
| GET    | `/api/papers/:id`         | One paper                                                       |
| POST   | `/api/papers`             | Add a paper                                                     |
| PUT    | `/api/papers/:id`         | Correct metadata                                                |
| DELETE | `/api/papers/:id`         | Remove a duplicate                                              |
| GET    | `/api/reading-list`       | Your entries, with `status` and `sort` filters                  |
| POST   | `/api/reading-list`       | Save a paper                                                    |
| PUT    | `/api/reading-list/:id`   | Update status, priority, tags or note                           |
| DELETE | `/api/reading-list/:id`   | Remove an entry                                                 |

## A few notes on how it is built

The `papers` collection holds the seeded catalog. `readingList` holds per user entries,
each with a `userId`, a status, a priority, tags and the note. Reading list entries carry
their own copy of the paper's title, authors and year rather than referencing a paper by
id, which is what keeps the two halves independent.

Deployment is a single Vercel project. `public/` is served as static files and
`api/index.js` runs Express as a serverless function, with a rewrite in `vercel.json`
sending `/api/*` to it. Because both come from the same origin there is no cross origin
request anywhere, so the app needs no CORS middleware at all.

The Mongo client is cached on `globalThis` rather than created per request. Serverless
functions get reused between invocations, and opening a fresh connection pool every time
would exhaust Atlas connection limits quickly.

One thing that caught us out: OpenAlex does not return abstracts as text. It returns an
inverted index, a map of each word to the positions it appears at, so the seed script has to
reassemble the sentence before storing it.

## Design document

The full design document, with personas, user stories and wireframes, is at
[docs/Design-Document.pdf](docs/Design-Document.pdf).

## License

MIT. See [LICENSE](LICENSE).

## Data

Paper metadata comes from [OpenAlex](https://openalex.org), which is free and open.
