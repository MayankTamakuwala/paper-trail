import app from "./app.js";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log("Paper Trail running at http://localhost:" + port);
});
