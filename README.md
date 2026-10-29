# LS 2.0 analysis tables: Vercel + Azure SQL

The page (public/index.html) asks three API files for data. The API files read Azure SQL.

    Browser  ->  /api/manifest, /api/facilities, /api/page  ->  Azure SQL (read-only login)

## Set up, in order

1. Azure SQL: run `sql/schema.sql`, then `sql/readonly_user.sql` (change the password first).
2. Load today's data: `pip install pyodbc`, then
   `python tools/load_to_sql.py --data data --conn "<ODBC connection string>"`
   Add `--dry-run` first to see the row counts. Expect 131 facilities, 32 pages and 1,396,359 answers.
   The `data` folder is the prototype's data folder.
3. Vercel: import this folder as a project. Add the four variables from `.env.example`
   (Project Settings > Environment Variables). Deploy.
4. Azure SQL firewall: Vercel calls from changing addresses. See "Firewall" below.
5. After any change to the prototype page, rebuild the hosted page:
   `python tools/make_public.py prototype/index.html`

## Endpoints

| Path | Returns |
|---|---|
| `/api/manifest` | page list and the not-connected sheets |
| `/api/facilities` | all facilities, in a fixed order (`idx`) |
| `/api/page?id=em-available&lga=Chikun` | one page for one LGA. Without `lga`, all LGAs |

The page asks for one LGA at a time and joins the replies. Vercel limits a reply to 4.5 MB.
The biggest page today is 3.2 MB for all LGAs. One LGA per request keeps every reply small
as the study grows to 23 LGAs.

## Firewall (Azure SQL)

- Vercel Static IPs (Pro plan, $100 per month per project plus data transfer): add the two IPs Vercel
  gives you to the Azure SQL firewall. This is the safe option.
- Without Static IPs you would have to allow every address. Do not do that with real data.

## Before real data goes in: sign-in

These API paths are open to anyone who has the link. Add sign-in first (Vercel deployment protection,
or Microsoft Entra ID). Until then use test data only.

## What is not here yet

- Ask AI: it needs the Claude viewer, so the button hides itself on Vercel. It needs a server-side AI call.
- Adding a facility: give it the next `idx` number. Never reuse or change an old `idx`.
- Weekly data: insert into `page_visits` (one row per facility visit) and `responses` (one row per answer).

## Tested here, and not tested

- Tested: the loader's row counts, the data shaping (all 32 pages come back identical to today's files),
  the three endpoints against a stand-in for the database, the page in hosted mode, and file download.
- Not tested: the SQL text on a real Azure SQL database, the loader's database insert, and Vercel itself.
  Expect small fixes on the first run.
