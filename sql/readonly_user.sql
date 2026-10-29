-- Run in the database (not master). The website's API signs in with this account.
-- It can read the tables and nothing else.
CREATE USER ls2_reader WITH PASSWORD = 'CHANGE-THIS-LONG-RANDOM-PASSWORD';
GRANT SELECT ON dbo.facilities   TO ls2_reader;
GRANT SELECT ON dbo.pages        TO ls2_reader;
GRANT SELECT ON dbo.off_pages    TO ls2_reader;
GRANT SELECT ON dbo.page_columns TO ls2_reader;
GRANT SELECT ON dbo.page_weeks   TO ls2_reader;
GRANT SELECT ON dbo.page_visits  TO ls2_reader;
GRANT SELECT ON dbo.responses    TO ls2_reader;
