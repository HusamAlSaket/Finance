document.addEventListener("DOMContentLoaded", () => {
  fetch("data.json")
    .then((res) => res.json())
    .then((data) => renderStatements(data.statements))
    .catch((err) => console.error("Failed to load JSON:", err));
});
function renderStatements(statements) {
  const container = document.getElementById("statements");

  statements.forEach((statement) => {
    const block = document.createElement("div");
    block.className = "table-block";

    // ✅ Add company name as h1 (only once if desired)
    const companyHeading = document.createElement("h1");
    companyHeading.textContent = statement.company_name;
    block.appendChild(companyHeading);

    const title = document.createElement("h3");
    title.textContent = `${statement.statement_type} (${statement.date})`;
    block.appendChild(title);

    const table = document.createElement("table");

    // Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Add 'name' as the first column manually
    const nameCol = document.createElement("th");
    nameCol.textContent = "البند";
    headerRow.appendChild(nameCol);

    statement.columns.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");

    statement.rows.forEach((row) => {
      const tr = document.createElement("tr");

      // Add the 'name' column first
      const nameCell = document.createElement("td");
      nameCell.textContent = row.name || "";
      nameCell.style.fontWeight =
        row["٢٠٢٤"] == null && row["٢٠٢٣"] == null ? "bold" : "normal";
      tr.appendChild(nameCell);

      // Add the dynamic columns from the statement
      statement.columns.forEach((col) => {
        const td = document.createElement("td");
        td.textContent = row[col] ?? "";
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    block.appendChild(table);
    container.appendChild(block);
  });
}
