# Importing the adjusted scientific package

> English version of [../05-importacion.md](../05-importacion.md). Commands and table names are the real identifiers.

The administrative importer is implemented in `backend/src/importador/`. It reads the standardised ZIP v1.0.0, verifies its integrity and loads `ciencia`. It does not run the bundled pipeline, does not query external providers, does not write to `public`, does not publish builds and does not record human approvals.

## Requirements and execution

Node as in `package.json`, Python 3 available as `python` and the project's migrations applied. `PYTHON` may point to another executable. No new npm dependencies were added. Loading needs `DATABASE_URL` and, if applicable, `DATABASE_SSL`, read from `desarrollo/.env`. The validation mode needs no database.

From `desarrollo`, in PowerShell:

```powershell
$paquete = (Resolve-Path '../<package>.zip').Path
$huella = '3fe144ab34f0f11a8e3c4eccf701d6c8567a365d12a0bf5f9114991e70c28f67'
pnpm --filter @jiimatzin/backend importar -- --archivo "$paquete" --sha256 $huella --validar
pnpm --filter @jiimatzin/backend importar -- --archivo "$paquete" --sha256 $huella
```

The expected SHA-256 is mandatory and must come from a record external to the ZIP: the package's publication record. Do not use the hash of another ZIP with a similar name. Relative paths given to the command are resolved from `backend`; the example avoids that ambiguity.

The command writes progress to stderr and the JSON result to stdout. A failure produces a non-zero exit code. `--ayuda` shows the options.

## Pre-checks

1. Verifies the ZIP's SHA-256, duplicate members, relative paths, links, encryption and a 2 GiB uncompressed limit.
2. Recomputes the `checksums.sha256` inventory (198 entries in the real package), requires manifest coverage, cross-checks `manifest.files`, the processor's hashes and `content_hash_reproducible`.
3. Checks the 20 JSONL files and their counts. Rejects JSON with repeated keys, non-finite numbers and empty lines. It only prepares those JSONL files in its own temporary directory, removed at the end even after a normal failure.
4. Requires the six versioned JSON contracts of the received format. Records are validated with Zod using copies in `src/importador/schemas`, without running validators supplied by the package.
5. Checks processor identity, policy, types, provenance, memberships, languages and fact-card references. Validates units, flags required by the policy, LMST, fictional day, coverage, missing values and the solar time sequence.

`--validar` checks integrity, contracts, relations resolved in memory and projections. FKs, conflicts with existing rows and the comparison of statistics against lineage are checked during the SQL load.

Integrity verification does not certify NASA's authenticity and does not re-extract data from the providers. The original A/B locations are kept as relative references; resolving and backing them up remains operational.

## Mapping

| Input | Treatment |
| --- | --- |
| `sources`, `datasets` | Keeps the package's IDs, institution, product and context |
| `source_files.locations` | Separates identity by hash from the relative A/B locations |
| `captures` | Keeps public parameters, attempts and metadata; missing date → NULL; `Z` and `+00:00` are read as UTC |
| Scientific envelopes | Keeps the whole envelope in `processed_records.payload`; projects typed data and provenance |
| REMS observations | Selected only; keeps flags; does not turn −999 into zero or invent missing measurements |
| Hourly aggregates | Keeps null statistics when there are no samples; validates counts, minimum, maximum, mean and coverage against lineage |
| DONKI FLR | Keeps solar context; does not turn it into a Martian dose |
| RadLab ISS | Keeps `timestamp_original`; `observed_at_utc` stays NULL |
| OSDR | Mission dates MM/DD/YYYY are projected to DATE; missing experiment dates stay NULL; originals stay in metadata |
| Fact cards | Keeps limits, references and mechanics; does not create `fact_reviews` rows |
| Instrument annotations | Resolves the file by unambiguous annotation ID; requires correspondence with sol/hour |

The fact-card catalogue gathers contexts from different missions. A record's specific context is never replaced by its dataset's general context.

The comparison of means admits a relative numerical error of `1e-10` (with a minimum scale of 1), for floating-point accumulation differences between Python and PostgreSQL. It is not a margin of physical uncertainty. Minimums and maximums must match.

## Transactions and idempotency

An advisory lock serialises imports. First the policy, processor and `candidate` publication are recorded transactionally. Then a real `import_run` and a transaction for the whole package content are opened.

Typed temporary tables are filled in batches of 1000 rows and reject duplicate keys. Inserts use `ON CONFLICT DO NOTHING`, followed by a comparison of **all** projected columns with the existing data. An ID with different content aborts: revisions are never overwritten or silently completed. A second identical load inserts zero content rows and adds its own audit record.

Each statement of the content transaction has a 120-second limit; the whole command may take longer. Lineage checks compare totals and cardinality of observations to avoid quadratic scans.

Only publications in `candidate` state may be loaded. It does not modify `validated`, `published`, `retired` or `importing` publications.

If the content fails, that whole transaction is rolled back and the run is marked `failed`. The policy, processor and candidate publication may remain as metadata of the attempt. Failures before the publication/run is recorded are reported by the CLI, without creating an `import_run` with a non-existent FK. A forced interruption may leave a `running` attempt and system temporary files; it is not reclassified automatically without checking whether the process is still alive.

Importing does not complete the publication controls (`backend/src/publicaciones/`). Imported fact cards keep returning 404 in the API until their human review.

## Tests

- `pnpm test`: tests without PostgreSQL, including invalid ZIPs, contracts, units, times, memberships and preservation of missing values. Requires Python 3.
- `pnpm test:integracion`: a new temporary database per suite, migrations from scratch, minimal load, repetition without duplicates, content conflict, lineage rollback and rejection of states other than `candidate`. Databases are removed at the end.
- Optional full test: define `DATASET_TEST_ARCHIVE` (absolute path) and `DATASET_TEST_SHA256` before `pnpm test:integracion`. It loads and repeats the real ZIP in the temporary database; checks 263,782 records and the counts per subtype.

The old exploratory rules M01–M06 (29 CME, FLR 404, RadLab 500 and 70 hashes) do not apply to this adjusted package. Their original errors remain as captures or file content, without becoming selected measurements.
